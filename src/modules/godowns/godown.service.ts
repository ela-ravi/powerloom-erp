import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface GodownRow {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  is_main: boolean;
  godown_type: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: GodownRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    address: row.address,
    isMain: row.is_main,
    godownType: row.godown_type,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class GodownService {
  async create(
    tenantId: string,
    data: {
      name: string;
      address?: string;
      isMain?: boolean;
      godownType?: string;
    },
  ) {
    // Enforce only one main godown per tenant
    if (data.isMain) {
      const existingMain = await sql<GodownRow[]>`
        SELECT id FROM godowns
        WHERE tenant_id = ${tenantId} AND is_main = true
      `;
      if (existingMain.length > 0) {
        throw AppError.conflict("A main godown already exists for this tenant");
      }
    }

    const result = await sql<GodownRow[]>`
      INSERT INTO godowns (tenant_id, name, address, is_main, godown_type)
      VALUES (
        ${tenantId}, ${data.name}, ${data.address ?? null},
        ${data.isMain ?? false}, ${data.godownType ?? "godown"}
      )
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      godownType?: string;
      isActive?: boolean;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM godowns
      WHERE tenant_id = ${tenantId}
      ${query.godownType ? sql`AND godown_type = ${query.godownType}` : sql``}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<GodownRow[]>`
      SELECT * FROM godowns
      WHERE tenant_id = ${tenantId}
      ${query.godownType ? sql`AND godown_type = ${query.godownType}` : sql``}
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
      address: string | null;
      isMain: boolean;
      godownType: string;
      isActive: boolean;
    }>,
  ) {
    const existing = await sql<GodownRow[]>`
      SELECT * FROM godowns WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Godown not found");
    }

    // Enforce only one main godown per tenant
    if (data.isMain === true && !existing[0].is_main) {
      const existingMain = await sql<GodownRow[]>`
        SELECT id FROM godowns
        WHERE tenant_id = ${tenantId} AND is_main = true AND id != ${id}
      `;
      if (existingMain.length > 0) {
        throw AppError.conflict("A main godown already exists for this tenant");
      }
    }

    const result = await sql<GodownRow[]>`
      UPDATE godowns SET
        name = COALESCE(${data.name ?? null}, name),
        address = ${data.address !== undefined ? data.address : existing[0].address},
        is_main = COALESCE(${data.isMain ?? null}, is_main),
        godown_type = COALESCE(${data.godownType ?? null}, godown_type),
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }
}
