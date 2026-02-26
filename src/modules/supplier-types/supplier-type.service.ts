import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface SupplierTypeRow {
  id: string;
  tenant_id: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: SupplierTypeRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupplierTypeService {
  async create(tenantId: string, data: { name: string }) {
    const existing = await sql<SupplierTypeRow[]>`
      SELECT id FROM supplier_types
      WHERE tenant_id = ${tenantId} AND name = ${data.name}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Supplier type with this name already exists");
    }

    const result = await sql<SupplierTypeRow[]>`
      INSERT INTO supplier_types (tenant_id, name)
      VALUES (${tenantId}, ${data.name})
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async findAll(tenantId: string) {
    const data = await sql<SupplierTypeRow[]>`
      SELECT * FROM supplier_types
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
    const existing = await sql<SupplierTypeRow[]>`
      SELECT * FROM supplier_types WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Supplier type not found");
    }

    if (data.name) {
      const dup = await sql<SupplierTypeRow[]>`
        SELECT id FROM supplier_types
        WHERE tenant_id = ${tenantId} AND name = ${data.name} AND id != ${id}
      `;
      if (dup.length > 0) {
        throw AppError.conflict("Supplier type with this name already exists");
      }
    }

    const result = await sql<SupplierTypeRow[]>`
      UPDATE supplier_types SET
        name = COALESCE(${data.name ?? null}, name),
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async delete(tenantId: string, id: string) {
    const existing = await sql<SupplierTypeRow[]>`
      SELECT * FROM supplier_types WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Supplier type not found");
    }

    // Check if any suppliers reference this type
    const inUse = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM suppliers
      WHERE tenant_id = ${tenantId} AND supplier_type = ${existing[0].name}
    `;
    if (parseInt(inUse[0].count, 10) > 0) {
      throw AppError.conflict(
        "Cannot delete this supplier type — it is in use by one or more suppliers",
      );
    }

    await sql`
      DELETE FROM supplier_types WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
  }
}
