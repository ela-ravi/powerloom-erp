import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface SupplierRow {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  supplier_type: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: SupplierRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    gstin: row.gstin,
    supplierType: row.supplier_type,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupplierService {
  async create(
    tenantId: string,
    data: { name: string; phone?: string; address?: string; gstin?: string; supplierType?: string },
  ) {
    const result = await sql<SupplierRow[]>`
      INSERT INTO suppliers (tenant_id, name, phone, address, gstin, supplier_type)
      VALUES (${tenantId}, ${data.name}, ${data.phone ?? null}, ${data.address ?? null}, ${data.gstin ?? null}, ${data.supplierType ?? null})
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
      SELECT COUNT(*) as count FROM suppliers
      WHERE tenant_id = ${tenantId}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<SupplierRow[]>`
      SELECT * FROM suppliers
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
      phone: string | null;
      address: string | null;
      gstin: string | null;
      supplierType: string | null;
      isActive: boolean;
    }>,
  ) {
    const existing = await sql<SupplierRow[]>`
      SELECT * FROM suppliers WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Supplier not found");
    }

    const result = await sql<SupplierRow[]>`
      UPDATE suppliers SET
        name = COALESCE(${data.name ?? null}, name),
        phone = ${data.phone !== undefined ? data.phone : existing[0].phone},
        address = ${data.address !== undefined ? data.address : existing[0].address},
        gstin = ${data.gstin !== undefined ? data.gstin : existing[0].gstin},
        supplier_type = ${data.supplierType !== undefined ? data.supplierType : existing[0].supplier_type},
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }
}
