import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface CustomerRow {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  state_code: string;
  gstin: string | null;
  customer_type: string;
  credit_period_days: number;
  outstanding_balance: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface CustomerProductPriceRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  product_id: string;
  selling_price_per_piece: string;
  product_name: string;
  created_at: Date;
  updated_at: Date;
}

function toProductPriceResponse(row: CustomerProductPriceRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    customerId: row.customer_id,
    productId: row.product_id,
    productName: row.product_name,
    sellingPricePerPiece: parseFloat(row.selling_price_per_piece),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toResponse(row: CustomerRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    stateCode: row.state_code,
    gstin: row.gstin,
    customerType: row.customer_type,
    creditPeriodDays: row.credit_period_days,
    outstandingBalance: parseFloat(row.outstanding_balance),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CustomerService {
  async create(
    tenantId: string,
    data: {
      name: string;
      phone?: string;
      address?: string;
      stateCode: string;
      gstin?: string;
      customerType: string;
      creditPeriodDays?: number;
    },
  ) {
    const result = await sql<CustomerRow[]>`
      INSERT INTO customers (tenant_id, name, phone, address, state_code, gstin, customer_type, credit_period_days)
      VALUES (
        ${tenantId}, ${data.name}, ${data.phone ?? null}, ${data.address ?? null},
        ${data.stateCode}, ${data.gstin ?? null}, ${data.customerType}, ${data.creditPeriodDays ?? 30}
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
      customerType?: string;
      isActive?: boolean;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM customers
      WHERE tenant_id = ${tenantId}
      ${query.customerType ? sql`AND customer_type = ${query.customerType}` : sql``}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<CustomerRow[]>`
      SELECT * FROM customers
      WHERE tenant_id = ${tenantId}
      ${query.customerType ? sql`AND customer_type = ${query.customerType}` : sql``}
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
      stateCode: string;
      gstin: string | null;
      customerType: string;
      creditPeriodDays: number;
      isActive: boolean;
    }>,
  ) {
    const existing = await sql<CustomerRow[]>`
      SELECT * FROM customers WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Customer not found");
    }

    const result = await sql<CustomerRow[]>`
      UPDATE customers SET
        name = COALESCE(${data.name ?? null}, name),
        phone = ${data.phone !== undefined ? data.phone : existing[0].phone},
        address = ${data.address !== undefined ? data.address : existing[0].address},
        state_code = COALESCE(${data.stateCode ?? null}, state_code),
        gstin = ${data.gstin !== undefined ? data.gstin : existing[0].gstin},
        customer_type = COALESCE(${data.customerType ?? null}, customer_type),
        credit_period_days = COALESCE(${data.creditPeriodDays ?? null}, credit_period_days),
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async listProductPrices(tenantId: string, customerId: string) {
    const rows = await sql<CustomerProductPriceRow[]>`
      SELECT cpp.*, p.name AS product_name
      FROM customer_product_prices cpp
      JOIN products p ON p.id = cpp.product_id
      WHERE cpp.tenant_id = ${tenantId} AND cpp.customer_id = ${customerId}
      ORDER BY p.name ASC
    `;
    return rows.map(toProductPriceResponse);
  }

  async bulkUpsertProductPrices(
    tenantId: string,
    customerId: string,
    prices: Array<{ productId: string; sellingPricePerPiece: number }>,
  ) {
    // Verify customer belongs to tenant
    const existing = await sql<CustomerRow[]>`
      SELECT id FROM customers WHERE id = ${customerId} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Customer not found");
    }

    // Replace all prices: delete existing, then insert new
    await sql`
      DELETE FROM customer_product_prices
      WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}
    `;

    for (const price of prices) {
      await sql`
        INSERT INTO customer_product_prices (tenant_id, customer_id, product_id, selling_price_per_piece)
        VALUES (${tenantId}, ${customerId}, ${price.productId}, ${price.sellingPricePerPiece})
      `;
    }

    return this.listProductPrices(tenantId, customerId);
  }

  async deleteProductPrice(tenantId: string, customerId: string, priceId: string) {
    const result = await sql`
      DELETE FROM customer_product_prices
      WHERE id = ${priceId} AND tenant_id = ${tenantId} AND customer_id = ${customerId}
    `;
    if (result.count === 0) {
      throw AppError.notFound("Product price not found");
    }
  }

  async delete(tenantId: string, id: string) {
    const existing = await sql<CustomerRow[]>`
      SELECT * FROM customers WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Customer not found");
    }

    const inUse = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM invoices
      WHERE tenant_id = ${tenantId} AND customer_id = ${id}
    `;
    if (parseInt(inUse[0].count, 10) > 0) {
      throw AppError.conflict(
        "Cannot delete this customer — it has invoice records",
      );
    }

    await sql`
      DELETE FROM customers WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
  }

  async getProductPriceByProduct(tenantId: string, customerId: string, productId: string) {
    const rows = await sql<CustomerProductPriceRow[]>`
      SELECT cpp.*, p.name AS product_name
      FROM customer_product_prices cpp
      JOIN products p ON p.id = cpp.product_id
      WHERE cpp.tenant_id = ${tenantId}
        AND cpp.customer_id = ${customerId}
        AND cpp.product_id = ${productId}
    `;
    if (rows.length === 0) {
      throw AppError.notFound("No price configured for this product");
    }
    return toProductPriceResponse(rows[0]);
  }
}
