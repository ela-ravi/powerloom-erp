import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import type { PaginatedResponse } from "../../types/api.js";

interface UserRow {
  id: string;
  tenant_id: string;
  phone: string;
  name: string;
  role: string;
  pin_hash: string | null;
  language: string;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toUserResponse(row: UserRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    phone: row.phone,
    name: row.name,
    role: row.role,
    language: row.language,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserService {
  async create(
    tenantId: string,
    data: {
      phone: string;
      name: string;
      role: string;
      language?: string;
      wagerType?: number;
      initialAdvance?: number;
    },
  ) {
    // Check duplicate phone within tenant
    const existing = await sql<UserRow[]>`
      SELECT id FROM users
      WHERE tenant_id = ${tenantId} AND phone = ${data.phone}
    `;

    if (existing.length > 0) {
      throw AppError.conflict("Phone number already exists in this tenant");
    }

    const result = await sql<UserRow[]>`
      INSERT INTO users (tenant_id, phone, name, role, language)
      VALUES (${tenantId}, ${data.phone}, ${data.name}, ${data.role}, ${data.language ?? "en"})
      RETURNING *
    `;

    const user = result[0];

    // Auto-create wager profile for wager role
    if (data.role === "wager") {
      const wagerType = data.wagerType ?? 1;
      const advBal = data.initialAdvance ?? 0;
      await sql`
        INSERT INTO wager_profiles (tenant_id, user_id, wager_type, advance_balance, original_advance)
        VALUES (${tenantId}, ${user.id}, ${wagerType}, ${advBal}, ${advBal})
      `;
    }

    // Auto-create paavu_oati profile for paavu_oati role
    if (data.role === "paavu_oati") {
      const advBal = data.initialAdvance ?? 0;
      await sql`
        INSERT INTO paavu_oati_profiles (tenant_id, user_id, advance_balance, original_advance)
        VALUES (${tenantId}, ${user.id}, ${advBal}, ${advBal})
      `;
    }

    return toUserResponse(user);
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      role?: string;
      isActive?: boolean;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    let countQuery = sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM users
      WHERE tenant_id = ${tenantId}
      ${query.role ? sql`AND role = ${query.role}` : sql``}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
    `;
    const total = parseInt((await countQuery)[0].count, 10);

    const data = await sql<UserRow[]>`
      SELECT * FROM users
      WHERE tenant_id = ${tenantId}
      ${query.role ? sql`AND role = ${query.role}` : sql``}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toUserResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async findById(tenantId: string, id: string) {
    const result = await sql<UserRow[]>`
      SELECT * FROM users WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (result.length === 0) {
      throw AppError.notFound("User not found");
    }
    return toUserResponse(result[0]);
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<{
      name: string;
      phone: string;
      language: string;
      role: string;
      wagerType: number;
    }>,
  ) {
    const existing = await sql<UserRow[]>`
      SELECT * FROM users WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("User not found");
    }

    if (data.phone) {
      const dup = await sql<UserRow[]>`
        SELECT id FROM users
        WHERE tenant_id = ${tenantId} AND phone = ${data.phone} AND id != ${id}
      `;
      if (dup.length > 0) {
        throw AppError.conflict("Phone number already exists in this tenant");
      }
    }

    const result = await sql<UserRow[]>`
      UPDATE users SET
        name = COALESCE(${data.name ?? null}, name),
        phone = COALESCE(${data.phone ?? null}, phone),
        language = COALESCE(${data.language ?? null}, language),
        role = COALESCE(${data.role ?? null}, role),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    // Update wager profile if wagerType provided
    if (data.wagerType != null && existing[0].role === "wager") {
      await sql`
        UPDATE wager_profiles SET
          wager_type = ${data.wagerType},
          updated_at = NOW()
        WHERE user_id = ${id} AND tenant_id = ${tenantId}
      `;
    }

    return toUserResponse(result[0]);
  }

  async deactivate(tenantId: string, id: string) {
    const result = await sql<UserRow[]>`
      UPDATE users SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    if (result.length === 0) {
      throw AppError.notFound("User not found");
    }
    return toUserResponse(result[0]);
  }

  async getPermissions(tenantId: string, userId: string) {
    // Verify user exists and is staff
    const user = await sql<UserRow[]>`
      SELECT * FROM users WHERE id = ${userId} AND tenant_id = ${tenantId}
    `;
    if (user.length === 0) {
      throw AppError.notFound("User not found");
    }

    const perms = await sql<{ permission: string }[]>`
      SELECT permission FROM staff_permissions
      WHERE user_id = ${userId} AND tenant_id = ${tenantId}
    `;

    return {
      userId,
      permissions: perms.map((p) => p.permission),
    };
  }

  async setPermissions(
    tenantId: string,
    userId: string,
    permissions: string[],
  ) {
    // Verify user exists and is staff
    const user = await sql<UserRow[]>`
      SELECT * FROM users WHERE id = ${userId} AND tenant_id = ${tenantId}
    `;
    if (user.length === 0) {
      throw AppError.notFound("User not found");
    }
    if (user[0].role !== "staff") {
      throw AppError.validation("Only staff users can have permissions");
    }

    // Replace all permissions (delete + insert)
    await sql`
      DELETE FROM staff_permissions
      WHERE user_id = ${userId} AND tenant_id = ${tenantId}
    `;

    if (permissions.length > 0) {
      const values = permissions.map((p) => ({
        tenant_id: tenantId,
        user_id: userId,
        permission: p,
      }));

      for (const v of values) {
        await sql`
          INSERT INTO staff_permissions (tenant_id, user_id, permission)
          VALUES (${v.tenant_id}, ${v.user_id}, ${v.permission})
        `;
      }
    }

    return { userId, permissions };
  }
}
