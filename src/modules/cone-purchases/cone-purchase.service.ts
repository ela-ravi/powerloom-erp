import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface ConePurchaseRow {
  id: string;
  tenant_id: string;
  supplier_id: string;
  godown_id: string;
  product_id: string | null;
  supplier_type: string | null;
  color: string;
  batch_id: string | null;
  quantity_kg: string;
  rate_per_kg: string;
  total_cost: string;
  gst_rate_pct: string;
  gst_amount: string;
  invoice_number: string | null;
  purchase_date: string;
  notes: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  supplier_name?: string;
  godown_name?: string;
  product_name?: string;
}

function toResponse(row: ConePurchaseRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    supplierId: row.supplier_id,
    godownId: row.godown_id,
    productId: row.product_id,
    supplierType: row.supplier_type,
    color: row.color,
    batchId: row.batch_id,
    quantityKg: parseFloat(row.quantity_kg),
    ratePerKg: parseFloat(row.rate_per_kg),
    totalCost: parseFloat(row.total_cost),
    gstRatePct: parseFloat(row.gst_rate_pct),
    gstAmount: parseFloat(row.gst_amount),
    invoiceNumber: row.invoice_number,
    purchaseDate: row.purchase_date,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    supplierName: row.supplier_name ?? null,
    godownName: row.godown_name ?? null,
    productName: row.product_name ?? null,
  };
}

export class ConePurchaseService {
  async create(
    tenantId: string,
    userId: string,
    data: {
      supplierId: string;
      godownId: string;
      productId?: string;
      supplierType?: string;
      color: string;
      batchId?: string;
      quantityKg: number;
      ratePerKg: number;
      gstRatePct?: number;
      invoiceNumber?: string;
      purchaseDate?: string;
      notes?: string;
    },
  ) {
    // Validate batch if provided
    if (data.batchId) {
      const settings = await sql<{ batch_enabled: boolean }[]>`
        SELECT batch_enabled FROM tenant_settings WHERE tenant_id = ${tenantId}
      `;
      if (settings.length === 0 || !settings[0].batch_enabled) {
        throw AppError.validation(
          "Cannot use batch_id when batch system is disabled",
        );
      }
      const batch = await sql`
        SELECT id FROM batches WHERE id = ${data.batchId} AND tenant_id = ${tenantId}
      `;
      if (batch.length === 0) {
        throw AppError.validation("Batch not found");
      }
    }

    // Auto-calculate
    const totalCost = Math.round(data.quantityKg * data.ratePerKg * 100) / 100;
    const gstRatePct = data.gstRatePct ?? 0;
    const gstAmount = Math.round(totalCost * (gstRatePct / 100) * 100) / 100;

    // Create purchase
    const result = await sql<ConePurchaseRow[]>`
      INSERT INTO cone_purchases (
        tenant_id, supplier_id, godown_id, product_id, supplier_type, color, batch_id,
        quantity_kg, rate_per_kg, total_cost, gst_rate_pct, gst_amount,
        invoice_number, purchase_date, notes, created_by
      ) VALUES (
        ${tenantId}, ${data.supplierId}, ${data.godownId}, ${data.productId ?? null},
        ${data.supplierType ?? null}, ${data.color}, ${data.batchId ?? null},
        ${data.quantityKg}, ${data.ratePerKg}, ${totalCost}, ${gstRatePct}, ${gstAmount},
        ${data.invoiceNumber ?? null}, ${data.purchaseDate ?? new Date().toISOString().split("T")[0]},
        ${data.notes ?? null}, ${userId}
      )
      RETURNING *
    `;
    const purchase = result[0];

    // Upsert inventory at raw_cone stage (product_id is always NULL for raw cones)
    const batchCoalesce =
      data.batchId ?? "00000000-0000-0000-0000-000000000000";
    const existingInv = await sql<
      { id: string; quantity: string; weight_kg: string | null }[]
    >`
      SELECT id, quantity, weight_kg FROM inventory
      WHERE tenant_id = ${tenantId}
        AND godown_id = ${data.godownId}
        AND product_id IS NULL
        AND color = ${data.color}
        AND stage = 'raw_cone'
        AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
    `;

    let inventoryId: string;
    if (existingInv.length > 0) {
      const newQty = parseFloat(existingInv[0].quantity) + data.quantityKg;
      const newWeight =
        parseFloat(existingInv[0].weight_kg ?? "0") + data.quantityKg;
      await sql`
        UPDATE inventory SET
          quantity = ${newQty}, weight_kg = ${newWeight}, updated_at = NOW()
        WHERE id = ${existingInv[0].id}
      `;
      inventoryId = existingInv[0].id;
    } else {
      const inv = await sql<{ id: string }[]>`
        INSERT INTO inventory (tenant_id, godown_id, product_id, color, stage, batch_id, quantity, weight_kg)
        VALUES (${tenantId}, ${data.godownId}, ${null}, ${data.color}, 'raw_cone', ${data.batchId ?? null}, ${data.quantityKg}, ${data.quantityKg})
        RETURNING id
      `;
      inventoryId = inv[0].id;
    }

    // Log movement
    await sql`
      INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
      VALUES (${tenantId}, ${inventoryId}, 'increase', ${data.quantityKg}, ${data.quantityKg}, 'cone_purchase', ${purchase.id}, ${userId})
    `;

    return toResponse(purchase);
  }

  async update(
    tenantId: string,
    id: string,
    userId: string,
    data: {
      supplierId?: string;
      godownId?: string;
      productId?: string | null;
      supplierType?: string | null;
      color?: string;
      batchId?: string | null;
      quantityKg?: number;
      ratePerKg?: number;
      gstRatePct?: number;
      invoiceNumber?: string | null;
      purchaseDate?: string;
      notes?: string | null;
    },
  ) {
    const existing = await sql<ConePurchaseRow[]>`
      SELECT * FROM cone_purchases WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Cone purchase not found");
    }
    const row = existing[0];

    const supplierId = data.supplierId ?? row.supplier_id;
    const godownId = data.godownId ?? row.godown_id;
    const productId = data.productId !== undefined ? data.productId : row.product_id;
    const supplierType = data.supplierType !== undefined ? data.supplierType : row.supplier_type;
    const color = data.color ?? row.color;
    const batchId = data.batchId !== undefined ? data.batchId : row.batch_id;
    const quantityKg = data.quantityKg ?? parseFloat(row.quantity_kg);
    const ratePerKg = data.ratePerKg ?? parseFloat(row.rate_per_kg);
    const gstRatePct = data.gstRatePct ?? parseFloat(row.gst_rate_pct);
    const invoiceNumber = data.invoiceNumber !== undefined ? data.invoiceNumber : row.invoice_number;
    const purchaseDate = data.purchaseDate ?? row.purchase_date;
    const notes = data.notes !== undefined ? data.notes : row.notes;

    const totalCost = Math.round(quantityKg * ratePerKg * 100) / 100;
    const gstAmount = Math.round(totalCost * (gstRatePct / 100) * 100) / 100;

    const result = await sql<ConePurchaseRow[]>`
      UPDATE cone_purchases SET
        supplier_id = ${supplierId},
        godown_id = ${godownId},
        product_id = ${productId},
        supplier_type = ${supplierType},
        color = ${color},
        batch_id = ${batchId},
        quantity_kg = ${quantityKg},
        rate_per_kg = ${ratePerKg},
        total_cost = ${totalCost},
        gst_rate_pct = ${gstRatePct},
        gst_amount = ${gstAmount},
        invoice_number = ${invoiceNumber},
        purchase_date = ${purchaseDate},
        notes = ${notes},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    return toResponse(result[0]);
  }

  async delete(tenantId: string, id: string) {
    const existing = await sql<ConePurchaseRow[]>`
      SELECT * FROM cone_purchases WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Cone purchase not found");
    }
    const row = existing[0];

    // Reverse inventory: find the matching raw_cone inventory and subtract
    const batchCoalesce =
      row.batch_id ?? "00000000-0000-0000-0000-000000000000";
    const inv = await sql<
      { id: string; quantity: string; weight_kg: string | null }[]
    >`
      SELECT id, quantity, weight_kg FROM inventory
      WHERE tenant_id = ${tenantId}
        AND godown_id = ${row.godown_id}
        AND product_id IS NULL
        AND color = ${row.color}
        AND stage = 'raw_cone'
        AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
    `;

    if (inv.length > 0) {
      const quantityKg = parseFloat(row.quantity_kg);
      const currentQty = parseFloat(inv[0].quantity);
      const currentWeight = parseFloat(inv[0].weight_kg ?? "0");
      const newQty = Math.max(0, currentQty - quantityKg);
      const newWeight = Math.max(0, currentWeight - quantityKg);

      await sql`
        UPDATE inventory SET
          quantity = ${newQty}, weight_kg = ${newWeight}, updated_at = NOW()
        WHERE id = ${inv[0].id}
      `;
    }

    // Delete related inventory movements
    await sql`
      DELETE FROM inventory_movements
      WHERE reference_type = 'cone_purchase' AND reference_id = ${id} AND tenant_id = ${tenantId}
    `;

    // Delete the purchase
    await sql`
      DELETE FROM cone_purchases WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      supplierId?: string;
      productId?: string;
      supplierType?: string;
      purchaseDateFrom?: string;
      purchaseDateTo?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM cone_purchases
      WHERE tenant_id = ${tenantId}
      ${query.supplierId ? sql`AND supplier_id = ${query.supplierId}` : sql``}
      ${query.productId ? sql`AND product_id = ${query.productId}` : sql``}
      ${query.supplierType ? sql`AND supplier_type = ${query.supplierType}` : sql``}
      ${query.purchaseDateFrom ? sql`AND purchase_date >= ${query.purchaseDateFrom}` : sql``}
      ${query.purchaseDateTo ? sql`AND purchase_date <= ${query.purchaseDateTo}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<ConePurchaseRow[]>`
      SELECT cp.*, s.name AS supplier_name, g.name AS godown_name, p.name AS product_name
      FROM cone_purchases cp
      LEFT JOIN suppliers s ON s.id = cp.supplier_id
      LEFT JOIN godowns g ON g.id = cp.godown_id
      LEFT JOIN products p ON p.id = cp.product_id
      WHERE cp.tenant_id = ${tenantId}
      ${query.supplierId ? sql`AND cp.supplier_id = ${query.supplierId}` : sql``}
      ${query.productId ? sql`AND cp.product_id = ${query.productId}` : sql``}
      ${query.supplierType ? sql`AND cp.supplier_type = ${query.supplierType}` : sql``}
      ${query.purchaseDateFrom ? sql`AND cp.purchase_date >= ${query.purchaseDateFrom}` : sql``}
      ${query.purchaseDateTo ? sql`AND cp.purchase_date <= ${query.purchaseDateTo}` : sql``}
      ORDER BY cp.purchase_date DESC, cp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }
}
