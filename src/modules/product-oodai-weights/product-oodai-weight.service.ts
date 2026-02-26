import { sql } from "../../config/database.js";

interface ProductOodaiWeightRow {
  id: string;
  tenant_id: string;
  product_id: string;
  oodai_weight_kg: string;
  created_at: Date;
  updated_at: Date;
  product_name?: string;
}

function toResponse(row: ProductOodaiWeightRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    oodaiWeightKg: parseFloat(row.oodai_weight_kg),
    productName: row.product_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProductOodaiWeightService {
  async findAll(tenantId: string) {
    const data = await sql<ProductOodaiWeightRow[]>`
      SELECT pow.*, p.name AS product_name
      FROM product_oodai_weights pow
      JOIN products p ON p.id = pow.product_id
      WHERE pow.tenant_id = ${tenantId}
      ORDER BY p.name
    `;
    return data.map(toResponse);
  }

  async upsert(
    tenantId: string,
    data: { productId: string; oodaiWeightKg: number },
  ) {
    const result = await sql<ProductOodaiWeightRow[]>`
      INSERT INTO product_oodai_weights (tenant_id, product_id, oodai_weight_kg)
      VALUES (${tenantId}, ${data.productId}, ${data.oodaiWeightKg})
      ON CONFLICT (tenant_id, product_id)
      DO UPDATE SET oodai_weight_kg = ${data.oodaiWeightKg}, updated_at = NOW()
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async bulkUpsert(
    tenantId: string,
    items: { productId: string; oodaiWeightKg: number }[],
  ) {
    return await sql.begin(async (tx) => {
      const results: ProductOodaiWeightRow[] = [];
      for (const item of items) {
        const row = await tx<ProductOodaiWeightRow[]>`
          INSERT INTO product_oodai_weights (tenant_id, product_id, oodai_weight_kg)
          VALUES (${tenantId}, ${item.productId}, ${item.oodaiWeightKg})
          ON CONFLICT (tenant_id, product_id)
          DO UPDATE SET oodai_weight_kg = ${item.oodaiWeightKg}, updated_at = NOW()
          RETURNING *
        `;
        results.push(row[0]);
      }
      return results.map(toResponse);
    });
  }

  async delete(tenantId: string, productId: string) {
    await sql`
      DELETE FROM product_oodai_weights
      WHERE tenant_id = ${tenantId} AND product_id = ${productId}
    `;
  }
}
