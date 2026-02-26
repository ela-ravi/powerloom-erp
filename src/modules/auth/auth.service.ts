import bcrypt from "bcryptjs";
import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import { generateTokenPair, verifyRefreshToken } from "../../shared/jwt.js";
import { generateAndStoreOtp, verifyStoredOtp } from "../../shared/otp.js";
import type { UserRole } from "../../types/enums.js";

interface UserRow {
  id: string;
  tenant_id: string;
  phone: string;
  name: string;
  role: UserRole;
  pin_hash: string | null;
  language: string;
  is_active: boolean;
  last_login_at: Date | null;
}

interface TenantSettingsRow {
  auth_otp_enabled: boolean;
  auth_pin_enabled: boolean;
  batch_enabled: boolean;
  shift_enabled: boolean;
  inter_godown_transfer_enabled: boolean;
}

export class AuthService {
  async sendOtp(phone: string) {
    // Find user by phone
    const users = await sql<UserRow[]>`
      SELECT u.*, ts.auth_otp_enabled
      FROM users u
      JOIN tenant_settings ts ON ts.tenant_id = u.tenant_id
      WHERE u.phone = ${phone}
    `;

    if (users.length === 0) {
      throw AppError.notFound("User not found with this phone number");
    }

    const user = users[0];

    if (!user.is_active) {
      throw AppError.forbidden("Account is deactivated");
    }

    if (!(user as any).auth_otp_enabled) {
      throw AppError.validation(
        "OTP authentication is not enabled for this tenant",
      );
    }

    return generateAndStoreOtp(phone);
  }

  async verifyOtp(phone: string, code: string) {
    // Verify OTP using shared utility
    await verifyStoredOtp(phone, code);

    // Get user and generate tokens
    const users = await sql<UserRow[]>`
      SELECT * FROM users WHERE phone = ${phone} AND is_active = true
    `;

    if (users.length === 0) {
      throw AppError.unauthorized("User not found or inactive");
    }

    const user = users[0];

    // Update last login
    await sql`
      UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}
    `;

    const tokens = generateTokenPair({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    });

    // Get tenant settings for feature flags
    const settings = await sql<TenantSettingsRow[]>`
      SELECT * FROM tenant_settings WHERE tenant_id = ${user.tenant_id}
    `;

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        language: user.language,
        tenantId: user.tenant_id,
        hasPinSet: !!user.pin_hash,
      },
      featureFlags: settings[0]
        ? {
            batchEnabled: settings[0].batch_enabled,
            shiftEnabled: settings[0].shift_enabled,
            interGodownTransferEnabled:
              settings[0].inter_godown_transfer_enabled,
            authPinEnabled: settings[0].auth_pin_enabled,
          }
        : null,
    };
  }

  async verifyPin(phone: string, pin: string) {
    const users = await sql<(UserRow & { auth_pin_enabled: boolean })[]>`
      SELECT u.*, ts.auth_pin_enabled
      FROM users u
      JOIN tenant_settings ts ON ts.tenant_id = u.tenant_id
      WHERE u.phone = ${phone}
    `;

    if (users.length === 0) {
      throw AppError.notFound("User not found");
    }

    const user = users[0];

    if (!user.is_active) {
      throw AppError.forbidden("Account is deactivated");
    }

    if (!user.auth_pin_enabled) {
      throw AppError.validation(
        "PIN authentication is not enabled for this tenant",
      );
    }

    if (!user.pin_hash) {
      throw AppError.validation("PIN not set for this account");
    }

    const isValid = await bcrypt.compare(pin, user.pin_hash);
    if (!isValid) {
      throw AppError.unauthorized("Invalid PIN");
    }

    // Update last login
    await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`;

    const tokens = generateTokenPair({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    });

    const settings = await sql<TenantSettingsRow[]>`
      SELECT * FROM tenant_settings WHERE tenant_id = ${user.tenant_id}
    `;

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        language: user.language,
        tenantId: user.tenant_id,
        hasPinSet: true,
      },
      featureFlags: settings[0]
        ? {
            batchEnabled: settings[0].batch_enabled,
            shiftEnabled: settings[0].shift_enabled,
            interGodownTransferEnabled:
              settings[0].inter_godown_transfer_enabled,
            authPinEnabled: settings[0].auth_pin_enabled,
          }
        : null,
    };
  }

  async setPin(userId: string, pin: string) {
    const pinHash = await bcrypt.hash(pin, 10);
    await sql`
      UPDATE users SET pin_hash = ${pinHash}, updated_at = NOW()
      WHERE id = ${userId}
    `;
    return { message: "PIN set successfully" };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const tokens = generateTokenPair({
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
      });
      return tokens;
    } catch {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }
  }

  async getMe(userId: string, tenantId: string) {
    const users = await sql<UserRow[]>`
      SELECT * FROM users WHERE id = ${userId} AND tenant_id = ${tenantId}
    `;

    if (users.length === 0) {
      throw AppError.notFound("User not found");
    }

    const user = users[0];

    // Get permissions if staff
    let permissions: string[] = [];
    if (user.role === "staff") {
      const perms = await sql<{ permission: string }[]>`
        SELECT permission FROM staff_permissions
        WHERE user_id = ${userId} AND tenant_id = ${tenantId}
      `;
      permissions = perms.map((p) => p.permission);
    }

    // Get settings
    const settings = await sql<TenantSettingsRow[]>`
      SELECT * FROM tenant_settings WHERE tenant_id = ${tenantId}
    `;

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        language: user.language,
        tenantId: user.tenant_id,
        hasPinSet: !!user.pin_hash,
        permissions,
      },
      featureFlags: settings[0]
        ? {
            batchEnabled: settings[0].batch_enabled,
            shiftEnabled: settings[0].shift_enabled,
            interGodownTransferEnabled:
              settings[0].inter_godown_transfer_enabled,
            authPinEnabled: settings[0].auth_pin_enabled,
          }
        : null,
    };
  }
}
