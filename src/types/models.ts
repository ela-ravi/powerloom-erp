import type { UserRole, Permission } from "./enums.js";

export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantScopedModel extends BaseModel {
  tenantId: string;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  role: UserRole;
}

export interface TokenPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  type: "access" | "refresh";
}

export interface StaffPermissionSet {
  userId: string;
  permissions: Permission[];
}
