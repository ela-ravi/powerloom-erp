import { app } from "../../src/app.js";
import { generateTokenPair } from "../../src/shared/jwt.js";
import { UserRole } from "../../src/types/enums.js";
import type { TokenPair } from "../../src/shared/jwt.js";
import crypto from "crypto";

export function createTestTenantId(): string {
  return crypto.randomUUID();
}

export function createTestUserId(): string {
  return crypto.randomUUID();
}

export function getAuthToken(
  userId?: string,
  tenantId?: string,
  role: UserRole = UserRole.OWNER,
): TokenPair {
  return generateTokenPair({
    userId: userId ?? createTestUserId(),
    tenantId: tenantId ?? createTestTenantId(),
    role,
  });
}

export function getSuperAdminToken(
  userId?: string,
  tenantId?: string,
): TokenPair {
  return getAuthToken(
    userId ?? createTestUserId(),
    tenantId ?? createTestTenantId(),
    UserRole.SUPER_ADMIN,
  );
}

export { app };
