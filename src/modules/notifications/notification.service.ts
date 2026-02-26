import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import { sendPush } from "../../shared/push.js";

interface NotificationRow {
  id: string;
  tenant_id: string;
  user_id: string;
  event_type: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  read_at: Date | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: Date;
}

function toResponse(row: NotificationRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    eventType: row.event_type,
    title: row.title,
    message: row.message,
    priority: row.priority,
    isRead: row.is_read,
    readAt: row.read_at,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    createdAt: row.created_at,
  };
}

export class NotificationService {
  async findAll(
    tenantId: string,
    userId: string,
    query: {
      limit?: number;
      offset?: number;
      eventType?: string;
      isRead?: boolean;
      priority?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM notifications
      WHERE tenant_id = ${tenantId} AND user_id = ${userId}
      ${query.eventType ? sql`AND event_type = ${query.eventType}` : sql``}
      ${query.isRead !== undefined ? sql`AND is_read = ${query.isRead}` : sql``}
      ${query.priority ? sql`AND priority = ${query.priority}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<NotificationRow[]>`
      SELECT * FROM notifications
      WHERE tenant_id = ${tenantId} AND user_id = ${userId}
      ${query.eventType ? sql`AND event_type = ${query.eventType}` : sql``}
      ${query.isRead !== undefined ? sql`AND is_read = ${query.isRead}` : sql``}
      ${query.priority ? sql`AND priority = ${query.priority}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async getUnreadCount(tenantId: string, userId: string) {
    const result = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM notifications
      WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND is_read = false
    `;
    return { unreadCount: parseInt(result[0].count, 10) };
  }

  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    const result = await sql<NotificationRow[]>`
      UPDATE notifications SET is_read = true, read_at = NOW()
      WHERE id = ${notificationId} AND tenant_id = ${tenantId} AND user_id = ${userId}
      RETURNING *
    `;
    if (result.length === 0) {
      throw AppError.notFound("Notification not found");
    }
    return toResponse(result[0]);
  }

  async markAllAsRead(tenantId: string, userId: string) {
    const result = await sql<{ count: string }[]>`
      WITH updated AS (
        UPDATE notifications SET is_read = true, read_at = NOW()
        WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND is_read = false
        RETURNING id
      )
      SELECT COUNT(*) as count FROM updated
    `;
    return { markedCount: parseInt(result[0].count, 10) };
  }

  async emit(
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
  ) {
    const result = await sql<NotificationRow[]>`
      INSERT INTO notifications (
        tenant_id, user_id, event_type, title, message,
        priority, reference_type, reference_id
      ) VALUES (
        ${tenantId}, ${data.userId}, ${data.eventType}, ${data.title}, ${data.message},
        ${data.priority ?? "medium"}, ${data.referenceType ?? null}, ${data.referenceId ?? null}
      )
      RETURNING *
    `;

    // Dispatch push notification (fire-and-forget)
    sendPush(tenantId, data.userId, {
      title: data.title,
      body: data.message,
      data: {
        eventType: data.eventType,
        ...(data.referenceType ? { referenceType: data.referenceType } : {}),
        ...(data.referenceId ? { referenceId: data.referenceId } : {}),
      },
    }).catch(() => {});

    return toResponse(result[0]);
  }
}
