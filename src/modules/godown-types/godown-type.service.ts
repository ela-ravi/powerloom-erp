import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface GodownTypeRow {
  id: string;
  tenant_id: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: GodownTypeRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class GodownTypeService {
  async create(tenantId: string, data: { name: string }) {
    const existing = await sql<GodownTypeRow[]>`
      SELECT id FROM godown_types
      WHERE tenant_id = ${tenantId} AND name = ${data.name}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Godown type with this name already exists");
    }

    const result = await sql<GodownTypeRow[]>`
      INSERT INTO godown_types (tenant_id, name)
      VALUES (${tenantId}, ${data.name})
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async findAll(tenantId: string) {
    const data = await sql<GodownTypeRow[]>`
      SELECT * FROM godown_types
      WHERE tenant_id = ${tenantId}
      ORDER BY is_active DESC, name ASC
    `;
    return { data: data.map(toResponse) };
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<{ name: string; isActive: boolean }>,
  ) {
    const existing = await sql<GodownTypeRow[]>`
      SELECT * FROM godown_types WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Godown type not found");
    }

    if (data.name) {
      const dup = await sql<GodownTypeRow[]>`
        SELECT id FROM godown_types
        WHERE tenant_id = ${tenantId} AND name = ${data.name} AND id != ${id}
      `;
      if (dup.length > 0) {
        throw AppError.conflict("Godown type with this name already exists");
      }
    }

    const result = await sql<GodownTypeRow[]>`
      UPDATE godown_types SET
        name = COALESCE(${data.name ?? null}, name),
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async delete(tenantId: string, id: string) {
    const existing = await sql<GodownTypeRow[]>`
      SELECT * FROM godown_types WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Godown type not found");
    }

    // Check if any godowns reference this type
    const inUse = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM godowns
      WHERE tenant_id = ${tenantId} AND godown_type = ${existing[0].name}
    `;
    if (parseInt(inUse[0].count, 10) > 0) {
      throw AppError.conflict(
        "Cannot delete this godown type — it is in use by one or more godowns",
      );
    }

    await sql`
      DELETE FROM godown_types WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
  }
}
