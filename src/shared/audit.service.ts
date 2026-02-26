import { sql } from "../config/database.js";
import type { AuditAction } from "../types/enums.js";

export interface AuditEntry {
  tenantId: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export class AuditService {
  static async log(entry: AuditEntry): Promise<void> {
    await sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, old_values, new_values)
      VALUES (
        ${entry.tenantId},
        ${entry.userId},
        ${entry.action},
        ${entry.entityType},
        ${entry.entityId},
        ${entry.oldValues ? sql.json(entry.oldValues as any) : null},
        ${entry.newValues ? sql.json(entry.newValues as any) : null}
      )
    `;
  }
}
