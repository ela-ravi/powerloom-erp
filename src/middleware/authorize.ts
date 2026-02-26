import type { Request, Response, NextFunction } from "express";
import { AppError } from "../shared/errors.js";
import { UserRole, Permission } from "../types/enums.js";
import type { AuthenticatedRequest } from "../types/api.js";
import { sql } from "../config/database.js";

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      next(AppError.unauthorized());
      return;
    }

    // Super admin always has access
    if (authReq.user.role === UserRole.SUPER_ADMIN) {
      next();
      return;
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      next(AppError.forbidden("Insufficient role permissions"));
      return;
    }

    next();
  };
}

export function requirePermission(...requiredPermissions: Permission[]) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      next(AppError.unauthorized());
      return;
    }

    // Owner and super admin bypass permission checks
    if (
      authReq.user.role === UserRole.SUPER_ADMIN ||
      authReq.user.role === UserRole.OWNER
    ) {
      next();
      return;
    }

    if (authReq.user.role !== UserRole.STAFF) {
      next(AppError.forbidden("Only staff can have granular permissions"));
      return;
    }

    try {
      const userPermissions = await sql<{ permission: string }[]>`
        SELECT permission FROM staff_permissions
        WHERE user_id = ${authReq.user.id} AND tenant_id = ${authReq.user.tenantId}
      `;

      const permissionSet = new Set(userPermissions.map((p) => p.permission));
      const hasAll = requiredPermissions.every((p) => permissionSet.has(p));

      if (!hasAll) {
        next(AppError.forbidden("Missing required permissions"));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
