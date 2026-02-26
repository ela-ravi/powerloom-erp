import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import { generateAndStoreOtp, verifyStoredOtp } from "../../shared/otp.js";
import { generateTokenPair } from "../../shared/jwt.js";
import { UserRole } from "../../types/enums.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxSql = any;

export class RegistrationService {
  async sendRegistrationOtp(phone: string) {
    // Check phone not already a tenant owner
    const existing = await sql<{ id: string }[]>`
      SELECT id FROM tenants WHERE phone = ${phone}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("This phone number is already registered as a business");
    }

    return generateAndStoreOtp(phone);
  }

  async registerTenant(data: {
    businessName: string;
    ownerName: string;
    phone: string;
    stateCode: string;
    email?: string;
    gstin?: string;
    otpCode: string;
  }) {
    // Verify OTP
    await verifyStoredOtp(data.phone, data.otpCode);

    // Check tenant phone uniqueness (race condition guard)
    const existing = await sql<{ id: string }[]>`
      SELECT id FROM tenants WHERE phone = ${data.phone}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("This phone number is already registered as a business");
    }

    // Create tenant + settings + owner in transaction
    const result = await sql.begin(async (tx: TxSql) => {
      // Create tenant
      const tenants = await tx<{ id: string }[]>`
        INSERT INTO tenants (name, owner_name, phone, email, state_code, gstin, status)
        VALUES (${data.businessName}, ${data.ownerName}, ${data.phone}, ${data.email ?? null}, ${data.stateCode}, ${data.gstin ?? null}, 'trial')
        RETURNING id
      `;
      const tenantId = tenants[0].id;

      // Create tenant settings with defaults
      await tx`
        INSERT INTO tenant_settings (tenant_id)
        VALUES (${tenantId})
      `;

      // Create owner user
      const users = await tx<{ id: string; name: string; phone: string; role: string; language: string; pin_hash: string | null }[]>`
        INSERT INTO users (tenant_id, phone, name, role, is_active)
        VALUES (${tenantId}, ${data.phone}, ${data.ownerName}, ${UserRole.OWNER}, true)
        RETURNING id, name, phone, role, language, pin_hash
      `;
      const user = users[0];

      return { tenantId, user };
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: result.user.id,
      tenantId: result.tenantId,
      role: UserRole.OWNER,
    });

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
      featureFlags: {
        batchEnabled: false,
        shiftEnabled: false,
        interGodownTransferEnabled: false,
        authPinEnabled: false,
      },
    };
  }
}
