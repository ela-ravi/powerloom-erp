import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface LoomDowntimeRow {
  id: string;
  tenant_id: string;
  loom_id: string;
  wager_id: string | null;
  reason: string;
  custom_reason: string | null;
  start_time: Date;
  end_time: Date | null;
  duration_minutes: number | null;
  reported_by: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: LoomDowntimeRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    loomId: row.loom_id,
    wagerId: row.wager_id,
    reason: row.reason,
    customReason: row.custom_reason,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    reportedBy: row.reported_by,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class LoomDowntimeService {
  async create(
    tenantId: string,
    userId: string,
    data: {
      loomId: string;
      wagerId?: string;
      reason: string;
      customReason?: string;
      startTime: string;
      notes?: string;
    },
  ) {
    // Validate: reason='other' requires customReason
    if (data.reason === "other" && !data.customReason) {
      throw AppError.validation(
        "Custom reason is required when reason is 'other'",
      );
    }

    const result = await sql<LoomDowntimeRow[]>`
      INSERT INTO loom_downtimes (
        tenant_id, loom_id, wager_id, reason, custom_reason,
        start_time, reported_by, notes
      ) VALUES (
        ${tenantId}, ${data.loomId}, ${data.wagerId ?? null},
        ${data.reason}, ${data.customReason ?? null},
        ${data.startTime}, ${userId}, ${data.notes ?? null}
      )
      RETURNING *
    `;

    return toResponse(result[0]);
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      endTime: string;
      notes?: string;
    },
  ) {
    // Fetch the existing downtime
    const existing = await sql<LoomDowntimeRow[]>`
      SELECT * FROM loom_downtimes WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Loom downtime not found");
    }

    // Calculate duration_minutes
    const startTime = new Date(existing[0].start_time);
    const endTime = new Date(data.endTime);
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );

    const result = await sql<LoomDowntimeRow[]>`
      UPDATE loom_downtimes SET
        end_time = ${data.endTime},
        duration_minutes = ${durationMinutes},
        notes = COALESCE(${data.notes ?? null}, notes),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    return toResponse(result[0]);
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      loomId?: string;
      wagerId?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM loom_downtimes
      WHERE tenant_id = ${tenantId}
      ${query.loomId ? sql`AND loom_id = ${query.loomId}` : sql``}
      ${query.wagerId ? sql`AND wager_id = ${query.wagerId}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<LoomDowntimeRow[]>`
      SELECT * FROM loom_downtimes
      WHERE tenant_id = ${tenantId}
      ${query.loomId ? sql`AND loom_id = ${query.loomId}` : sql``}
      ${query.wagerId ? sql`AND wager_id = ${query.wagerId}` : sql``}
      ORDER BY start_time DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }
}
