import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface LoomRow {
  id: string;
  tenant_id: string;
  loom_type_id: string;
  loom_number: string;
  assigned_wager_id: string | null;
  ownership: string;
  maintenance_status: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  loom_type_name?: string;
  wager_name?: string;
  owner_name?: string;
}

function toResponse(row: LoomRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    loomTypeId: row.loom_type_id,
    loomNumber: row.loom_number,
    assignedWagerId: row.assigned_wager_id,
    ownership: row.ownership,
    maintenanceStatus: row.maintenance_status,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    loomTypeName: row.loom_type_name ?? null,
    wagerName: row.wager_name ?? null,
    ownerName: row.owner_name ?? null,
  };
}

export class LoomService {
  async create(
    tenantId: string,
    data: {
      loomTypeId: string;
      loomNumber: string;
      assignedWagerId?: string;
      ownership: string;
      maintenanceStatus?: string;
    },
  ) {
    // Verify loom type exists
    const loomType = await sql`
      SELECT id FROM loom_types WHERE id = ${data.loomTypeId} AND tenant_id = ${tenantId}
    `;
    if (loomType.length === 0) {
      throw AppError.validation("Loom type not found");
    }

    // Check duplicate loom number
    const existing = await sql<LoomRow[]>`
      SELECT id FROM looms
      WHERE tenant_id = ${tenantId} AND loom_number = ${data.loomNumber}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Loom number already exists in this tenant");
    }

    // Validate assigned wager if provided
    if (data.assignedWagerId) {
      const wager = await sql`
        SELECT id, role FROM users WHERE id = ${data.assignedWagerId} AND tenant_id = ${tenantId}
      `;
      if (wager.length === 0) {
        throw AppError.validation("Assigned wager user not found");
      }
      if ((wager[0] as any).role !== "wager") {
        throw AppError.validation("Assigned user must have wager role");
      }
    }

    const result = await sql<LoomRow[]>`
      INSERT INTO looms (tenant_id, loom_type_id, loom_number, assigned_wager_id, ownership, maintenance_status)
      VALUES (
        ${tenantId}, ${data.loomTypeId}, ${data.loomNumber},
        ${data.assignedWagerId ?? null}, ${data.ownership},
        ${data.maintenanceStatus ?? "operational"}
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
      loomTypeId?: string;
      maintenanceStatus?: string;
      assignedWagerId?: string;
      isActive?: boolean;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM looms
      WHERE tenant_id = ${tenantId}
      ${query.loomTypeId ? sql`AND loom_type_id = ${query.loomTypeId}` : sql``}
      ${query.maintenanceStatus ? sql`AND maintenance_status = ${query.maintenanceStatus}` : sql``}
      ${query.assignedWagerId ? sql`AND assigned_wager_id = ${query.assignedWagerId}` : sql``}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<LoomRow[]>`
      SELECT l.*,
        lt.name AS loom_type_name,
        w.name AS wager_name,
        t.owner_name AS owner_name
      FROM looms l
      LEFT JOIN loom_types lt ON lt.id = l.loom_type_id
      LEFT JOIN users w ON w.id = l.assigned_wager_id
      LEFT JOIN tenants t ON t.id = l.tenant_id
      WHERE l.tenant_id = ${tenantId}
      ${query.loomTypeId ? sql`AND l.loom_type_id = ${query.loomTypeId}` : sql``}
      ${query.maintenanceStatus ? sql`AND l.maintenance_status = ${query.maintenanceStatus}` : sql``}
      ${query.assignedWagerId ? sql`AND l.assigned_wager_id = ${query.assignedWagerId}` : sql``}
      ${query.isActive !== undefined ? sql`AND l.is_active = ${query.isActive}` : sql``}
      ORDER BY l.created_at DESC
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
      loomTypeId: string;
      loomNumber: string;
      assignedWagerId: string | null;
      ownership: string;
      maintenanceStatus: string;
      isActive: boolean;
    }>,
  ) {
    const existing = await sql<LoomRow[]>`
      SELECT * FROM looms WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Loom not found");
    }

    if (data.loomNumber) {
      const dup = await sql<LoomRow[]>`
        SELECT id FROM looms
        WHERE tenant_id = ${tenantId} AND loom_number = ${data.loomNumber} AND id != ${id}
      `;
      if (dup.length > 0) {
        throw AppError.conflict("Loom number already exists in this tenant");
      }
    }

    if (data.loomTypeId) {
      const loomType = await sql`
        SELECT id FROM loom_types WHERE id = ${data.loomTypeId} AND tenant_id = ${tenantId}
      `;
      if (loomType.length === 0) {
        throw AppError.validation("Loom type not found");
      }
    }

    // Use explicit assigned_wager_id update if provided (including null to clear)
    const updateWager = data.assignedWagerId !== undefined;
    const result = await sql<LoomRow[]>`
      UPDATE looms SET
        loom_type_id = COALESCE(${data.loomTypeId ?? null}, loom_type_id),
        loom_number = COALESCE(${data.loomNumber ?? null}, loom_number),
        assigned_wager_id = ${updateWager ? data.assignedWagerId : sql`assigned_wager_id`},
        ownership = COALESCE(${data.ownership ?? null}, ownership),
        maintenance_status = COALESCE(${data.maintenanceStatus ?? null}, maintenance_status),
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async assignWager(tenantId: string, id: string, wagerId: string | null) {
    const existing = await sql<LoomRow[]>`
      SELECT * FROM looms WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Loom not found");
    }

    if (wagerId) {
      const wager = await sql`
        SELECT id, role, is_active FROM users WHERE id = ${wagerId} AND tenant_id = ${tenantId}
      `;
      if (wager.length === 0) {
        throw AppError.validation("Wager user not found");
      }
      if ((wager[0] as any).role !== "wager") {
        throw AppError.validation("Assigned user must have wager role");
      }
      if (!(wager[0] as any).is_active) {
        throw AppError.validation("Wager user is not active");
      }
    }

    const result = await sql<LoomRow[]>`
      UPDATE looms SET
        assigned_wager_id = ${wagerId},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }
}
