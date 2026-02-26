import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface LoomTypeRow {
  id: string;
  tenant_id: string;
  name: string;
  nickname: string | null;
  capacity_pieces_per_day: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: LoomTypeRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    nickname: row.nickname,
    capacityPiecesPerDay: row.capacity_pieces_per_day,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class LoomTypeService {
  async create(
    tenantId: string,
    data: { name: string; nickname?: string; capacityPiecesPerDay: number },
  ) {
    const existing = await sql<LoomTypeRow[]>`
      SELECT id FROM loom_types
      WHERE tenant_id = ${tenantId} AND name = ${data.name}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Loom type with this name already exists");
    }

    const result = await sql<LoomTypeRow[]>`
      INSERT INTO loom_types (tenant_id, name, nickname, capacity_pieces_per_day)
      VALUES (${tenantId}, ${data.name}, ${data.nickname ?? null}, ${data.capacityPiecesPerDay})
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async findAll(
    tenantId: string,
    query: { limit?: number; offset?: number; isActive?: boolean } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM loom_types
      WHERE tenant_id = ${tenantId}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<LoomTypeRow[]>`
      SELECT * FROM loom_types
      WHERE tenant_id = ${tenantId}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<{
      name: string;
      nickname: string | null;
      capacityPiecesPerDay: number;
      isActive: boolean;
    }>,
  ) {
    const existing = await sql<LoomTypeRow[]>`
      SELECT * FROM loom_types WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Loom type not found");
    }

    if (data.name) {
      const dup = await sql<LoomTypeRow[]>`
        SELECT id FROM loom_types
        WHERE tenant_id = ${tenantId} AND name = ${data.name} AND id != ${id}
      `;
      if (dup.length > 0) {
        throw AppError.conflict("Loom type with this name already exists");
      }
    }

    const result = await sql<LoomTypeRow[]>`
      UPDATE loom_types SET
        name = COALESCE(${data.name ?? null}, name),
        nickname = ${data.nickname !== undefined ? data.nickname : existing[0].nickname},
        capacity_pieces_per_day = COALESCE(${data.capacityPiecesPerDay ?? null}, capacity_pieces_per_day),
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }
}
