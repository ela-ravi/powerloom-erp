import { NotificationService } from "../modules/notifications/notification.service.js";

const notificationService = new NotificationService();

/**
 * Fire-and-forget notification emit. Never throws — notification failures
 * must not break primary business operations.
 */
export function notifyAsync(
  tenantId: string,
  data: {
    userId: string;
    eventType: string;
    title: string;
    message: string;
    priority?: string;
    referenceType?: string;
    referenceId?: string;
  },
): void {
  notificationService.emit(tenantId, data).catch(() => {
    // Swallow — notification is best-effort
  });
}

/**
 * Notify all tenant owners (fire-and-forget).
 */
export async function notifyOwners(
  tenantId: string,
  data: {
    eventType: string;
    title: string;
    message: string;
    priority?: string;
    referenceType?: string;
    referenceId?: string;
  },
): Promise<void> {
  try {
    const { sql } = await import("../config/database.js");
    const owners = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE tenant_id = ${tenantId} AND role = 'owner' AND is_active = true
    `;
    for (const owner of owners) {
      notifyAsync(tenantId, { ...data, userId: owner.id });
    }
  } catch {
    // Swallow
  }
}
