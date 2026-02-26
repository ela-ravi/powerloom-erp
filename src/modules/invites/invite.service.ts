import crypto from "crypto";
import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import { generateAndStoreOtp, verifyStoredOtp } from "../../shared/otp.js";
import { generateTokenPair } from "../../shared/jwt.js";
import type { UserRole } from "../../types/enums.js";
import type { PaginationQuery } from "../../types/api.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxSql = any;

interface InviteRow {
  id: string;
  tenant_id: string;
  code: string;
  role: string;
  max_uses: number;
  use_count: number;
  expires_at: Date | null;
  created_by: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toInviteResponse(row: InviteRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    code: row.code,
    role: row.role,
    maxUses: row.max_uses,
    useCount: row.use_count,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export class InviteService {
  // Authenticated: Create invite code
  async create(
    tenantId: string,
    createdBy: string,
    data: { role: string; maxUses?: number; expiresInDays?: number },
  ) {
    // Generate unique code with retry
    let code: string;
    let attempts = 0;
    while (true) {
      code = generateCode();
      const existing = await sql<{ id: string }[]>`
        SELECT id FROM invite_codes WHERE code = ${code}
      `;
      if (existing.length === 0) break;
      attempts++;
      if (attempts >= 10) {
        throw AppError.internal("Failed to generate unique invite code");
      }
    }

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const result = await sql<InviteRow[]>`
      INSERT INTO invite_codes (tenant_id, code, role, max_uses, expires_at, created_by)
      VALUES (${tenantId}, ${code}, ${data.role}, ${data.maxUses ?? 1}, ${expiresAt}, ${createdBy})
      RETURNING *
    `;

    return toInviteResponse(result[0]);
  }

  // Authenticated: List tenant's invite codes
  async findAll(tenantId: string, pagination: PaginationQuery = {}) {
    const limit = pagination.limit ?? 20;
    const offset = pagination.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM invite_codes WHERE tenant_id = ${tenantId}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<InviteRow[]>`
      SELECT * FROM invite_codes WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toInviteResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  // Authenticated: Deactivate invite code
  async deactivate(tenantId: string, id: string) {
    const result = await sql<InviteRow[]>`
      UPDATE invite_codes SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    if (result.length === 0) {
      throw AppError.notFound("Invite code not found");
    }
    return toInviteResponse(result[0]);
  }

  // Public: Validate invite code
  async validateCode(code: string) {
    const invites = await sql<(InviteRow & { tenant_name: string })[]>`
      SELECT ic.*, t.name as tenant_name
      FROM invite_codes ic
      JOIN tenants t ON t.id = ic.tenant_id
      WHERE ic.code = ${code.toUpperCase()}
        AND ic.is_active = true
        AND ic.use_count < ic.max_uses
        AND (ic.expires_at IS NULL OR ic.expires_at > NOW())
    `;

    if (invites.length === 0) {
      return { valid: false, role: null, tenantName: null };
    }

    return {
      valid: true,
      role: invites[0].role,
      tenantName: invites[0].tenant_name,
    };
  }

  // Public: Send OTP for invite registration
  async sendInviteOtp(code: string, phone: string) {
    // Validate invite first
    const validation = await this.validateCode(code);
    if (!validation.valid) {
      throw AppError.validation("Invalid or expired invite code");
    }

    // Check phone not already in the same tenant
    const invite = await sql<InviteRow[]>`
      SELECT * FROM invite_codes WHERE code = ${code.toUpperCase()}
    `;
    const existingUser = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE phone = ${phone} AND tenant_id = ${invite[0].tenant_id}
    `;
    if (existingUser.length > 0) {
      throw AppError.conflict("This phone number is already registered in this business");
    }

    return generateAndStoreOtp(phone);
  }

  // Public: Redeem invite code
  async redeem(data: {
    code: string;
    name: string;
    phone: string;
    otpCode: string;
  }) {
    const upperCode = data.code.toUpperCase();

    // Validate invite
    const invites = await sql<(InviteRow & { tenant_name: string })[]>`
      SELECT ic.*, t.name as tenant_name
      FROM invite_codes ic
      JOIN tenants t ON t.id = ic.tenant_id
      WHERE ic.code = ${upperCode}
        AND ic.is_active = true
        AND ic.use_count < ic.max_uses
        AND (ic.expires_at IS NULL OR ic.expires_at > NOW())
    `;

    if (invites.length === 0) {
      throw AppError.validation("Invalid or expired invite code");
    }

    const invite = invites[0];

    // Verify OTP
    await verifyStoredOtp(data.phone, data.otpCode);

    // Create user and update invite in transaction
    const result = await sql.begin(async (tx: TxSql) => {
      // Check phone uniqueness within tenant
      const existingUser = await tx<{ id: string }[]>`
        SELECT id FROM users WHERE phone = ${data.phone} AND tenant_id = ${invite.tenant_id}
      `;
      if (existingUser.length > 0) {
        throw AppError.conflict("This phone number is already registered in this business");
      }

      // Create user
      const users = await tx<{ id: string; name: string; phone: string; role: string; language: string; pin_hash: string | null }[]>`
        INSERT INTO users (tenant_id, phone, name, role, is_active)
        VALUES (${invite.tenant_id}, ${data.phone}, ${data.name}, ${invite.role}, true)
        RETURNING id, name, phone, role, language, pin_hash
      `;
      const user = users[0];

      // If role is wager, auto-create wager_profiles (type=1)
      if (invite.role === "wager") {
        await tx`
          INSERT INTO wager_profiles (tenant_id, user_id, name, phone, wager_type, loom_ownership, is_active)
          VALUES (${invite.tenant_id}, ${user.id}, ${data.name}, ${data.phone}, 1, 'wager', true)
        `;
      }

      // Increment use_count
      await tx`
        UPDATE invite_codes SET use_count = use_count + 1, updated_at = NOW()
        WHERE id = ${invite.id}
      `;

      return { tenantId: invite.tenant_id, user };
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: result.user.id,
      tenantId: result.tenantId,
      role: result.user.role as UserRole,
    });

    // Get tenant settings for feature flags
    const settings = await sql<{ batch_enabled: boolean; shift_enabled: boolean; inter_godown_transfer_enabled: boolean; auth_pin_enabled: boolean }[]>`
      SELECT batch_enabled, shift_enabled, inter_godown_transfer_enabled, auth_pin_enabled
      FROM tenant_settings WHERE tenant_id = ${result.tenantId}
    `;

    return {
      ...tokens,
      user: {
        id: result.user.id,
        name: result.user.name,
        phone: result.user.phone,
        role: result.user.role,
        language: result.user.language,
        tenantId: result.tenantId,
        hasPinSet: false,
      },
      featureFlags: settings[0]
        ? {
            batchEnabled: settings[0].batch_enabled,
            shiftEnabled: settings[0].shift_enabled,
            interGodownTransferEnabled: settings[0].inter_godown_transfer_enabled,
            authPinEnabled: settings[0].auth_pin_enabled,
          }
        : null,
    };
  }
}
