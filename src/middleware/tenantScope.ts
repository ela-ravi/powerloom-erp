import type { Request, Response, NextFunction } from "express";
import { sql } from "../config/database.js";
import { AppError } from "../shared/errors.js";
import { UserRole } from "../types/enums.js";
import type { AuthenticatedRequest } from "../types/api.js";

export async function tenantScope(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    next(AppError.internal("Tenant scope middleware requires authentication"));
    return;
  }

  let tenantId = authReq.user.tenantId;

  // Super admin can override tenant via header
  const headerTenantId = req.headers["x-tenant-id"] as string | undefined;
  if (headerTenantId) {
    if (authReq.user.role === UserRole.SUPER_ADMIN) {
      tenantId = headerTenantId;
      // Update the user context with the overridden tenant
      authReq.user = { ...authReq.user, tenantId };
    }
    // Non-super-admin: ignore the header, use their own tenant
  }

  if (!tenantId) {
    next(AppError.internal("Missing tenant context"));
    return;
  }

  try {
    await sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
    next();
  } catch (error) {
    next(AppError.internal("Failed to set tenant context"));
  }
}
