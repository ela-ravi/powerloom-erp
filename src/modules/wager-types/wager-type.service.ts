import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface WagerTypeRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  wage_basis: string;
  loom_ownership: string;
  work_scope: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: WagerTypeRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    wageBasis: row.wage_basis,
    loomOwnership: row.loom_ownership,
    workScope: row.work_scope,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class WagerTypeService {
  async create(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      wageBasis: string;
      loomOwnership: string;
      workScope: string;
    },
  ) {
    const existing = await sql<WagerTypeRow[]>`
      SELECT id FROM wager_types
      WHERE tenant_id = ${tenantId} AND name = ${data.name}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Wager type with this name already exists");
    }

    const result = await sql<WagerTypeRow[]>`
      INSERT INTO wager_types (tenant_id, name, description, wage_basis, loom_ownership, work_scope)
      VALUES (${tenantId}, ${data.name}, ${data.description ?? null}, ${data.wageBasis}, ${data.loomOwnership}, ${data.workScope})
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
      SELECT COUNT(*) as count FROM wager_types
      WHERE tenant_id = ${tenantId}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<WagerTypeRow[]>`
      SELECT * FROM wager_types
      WHERE tenant_id = ${tenantId}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
      ORDER BY created_at ASC
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
      description: string | null;
      wageBasis: string;
      loomOwnership: string;
      workScope: string;
      isActive: boolean;
    }>,
  ) {
    const existing = await sql<WagerTypeRow[]>`
      SELECT * FROM wager_types WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Wager type not found");
    }

    if (data.name) {
      const dup = await sql<WagerTypeRow[]>`
        SELECT id FROM wager_types
        WHERE tenant_id = ${tenantId} AND name = ${data.name} AND id != ${id}
      `;
      if (dup.length > 0) {
        throw AppError.conflict("Wager type with this name already exists");
      }
    }

    const result = await sql<WagerTypeRow[]>`
      UPDATE wager_types SET
        name = COALESCE(${data.name ?? null}, name),
        description = ${data.description !== undefined ? data.description : existing[0].description},
        wage_basis = COALESCE(${data.wageBasis ?? null}, wage_basis),
        loom_ownership = COALESCE(${data.loomOwnership ?? null}, loom_ownership),
        work_scope = COALESCE(${data.workScope ?? null}, work_scope),
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }
}
