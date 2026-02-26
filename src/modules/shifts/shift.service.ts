import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface ShiftRow {
  id: string;
  tenant_id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: ShiftRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    startTime: row.start_time,
    endTime: row.end_time,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ShiftService {
  private async requireShiftEnabled(tenantId: string) {
    const settings = await sql<{ shift_enabled: boolean }[]>`
      SELECT shift_enabled FROM tenant_settings WHERE tenant_id = ${tenantId}
    `;
    if (settings.length === 0 || !settings[0].shift_enabled) {
      throw AppError.forbidden("Shift tracking is not enabled for this tenant");
    }
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      startTime: string;
      endTime: string;
    },
  ) {
    await this.requireShiftEnabled(tenantId);

    // Check duplicate name
    const existing = await sql`
      SELECT id FROM shifts WHERE tenant_id = ${tenantId} AND name = ${data.name}
    `;
    if (existing.length > 0) {
      throw AppError.validation("A shift with this name already exists");
    }

    const result = await sql<ShiftRow[]>`
      INSERT INTO shifts (tenant_id, name, start_time, end_time)
      VALUES (${tenantId}, ${data.name}, ${data.startTime}, ${data.endTime})
      RETURNING *
    `;

    return toResponse(result[0]);
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      startTime?: string;
      endTime?: string;
      isActive?: boolean;
    },
  ) {
    await this.requireShiftEnabled(tenantId);

    const existing = await sql<ShiftRow[]>`
      SELECT * FROM shifts WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Shift not found");
    }

    // Check duplicate name if changing
    if (data.name && data.name !== existing[0].name) {
      const dup = await sql`
        SELECT id FROM shifts WHERE tenant_id = ${tenantId} AND name = ${data.name} AND id != ${id}
      `;
      if (dup.length > 0) {
        throw AppError.validation("A shift with this name already exists");
      }
    }

    const result = await sql<ShiftRow[]>`
      UPDATE shifts SET
        name = ${data.name ?? existing[0].name},
        start_time = ${data.startTime ?? existing[0].start_time},
        end_time = ${data.endTime ?? existing[0].end_time},
        is_active = ${data.isActive ?? existing[0].is_active},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    return toResponse(result[0]);
  }

  async findAll(
    tenantId: string,
    query: { limit?: number; offset?: number } = {},
  ) {
    await this.requireShiftEnabled(tenantId);

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM shifts
      WHERE tenant_id = ${tenantId} AND is_active = true
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<ShiftRow[]>`
      SELECT * FROM shifts
      WHERE tenant_id = ${tenantId} AND is_active = true
      ORDER BY start_time
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }
}
