import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface TransferRow {
  id: string;
  tenant_id: string;
  source_godown_id: string;
  dest_godown_id: string;
  product_id: string | null;
  color: string;
  stage: string;
  batch_id: string | null;
  quantity: string;
  weight_kg: string | null;
  notes: string | null;
  transferred_by: string;
  created_at: Date;
  source_godown_name?: string;
  dest_godown_name?: string;
  product_name?: string | null;
}

function toResponse(row: TransferRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    sourceGodownId: row.source_godown_id,
    destGodownId: row.dest_godown_id,
    productId: row.product_id,
    color: row.color,
    stage: row.stage,
    batchId: row.batch_id,
    quantity: parseFloat(row.quantity),
    weightKg: row.weight_kg ? parseFloat(row.weight_kg) : null,
    notes: row.notes,
    transferredBy: row.transferred_by,
    createdAt: row.created_at,
    sourceGodownName: row.source_godown_name ?? "",
    destGodownName: row.dest_godown_name ?? "",
    productName: row.product_name ?? null,
  };
}

export class TransferService {
  async create(
    tenantId: string,
    userId: string,
    data: {
      sourceGodownId: string;
      destGodownId: string;
      productId?: string;
      color: string;
      stage: string;
      batchId?: string;
      quantity: number;
      weightKg?: number;
      notes?: string;
    },
  ) {
    // Feature flag check
    const settings = await sql<{ inter_godown_transfer_enabled: boolean }[]>`
      SELECT inter_godown_transfer_enabled FROM tenant_settings WHERE tenant_id = ${tenantId}
    `;
    if (settings.length === 0 || !settings[0].inter_godown_transfer_enabled) {
      throw AppError.forbidden(
        "Inter-godown transfers are not enabled for this tenant",
      );
    }

    // Validate source != dest
    if (data.sourceGodownId === data.destGodownId) {
      throw AppError.validation(
        "Source and destination godowns must be different",
      );
    }

    if (data.productId) {
      // ── Product transfer: full inventory adjustment ──
      const batchCoalesce =
        data.batchId ?? "00000000-0000-0000-0000-000000000000";

      // Check source inventory has sufficient stock
      const sourceInv = await sql<
        { id: string; quantity: string; weight_kg: string | null }[]
      >`
        SELECT id, quantity, weight_kg FROM inventory
        WHERE tenant_id = ${tenantId}
          AND godown_id = ${data.sourceGodownId}
          AND product_id = ${data.productId}
          AND color = ${data.color}
          AND stage = ${data.stage}
          AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
      `;

      if (
        sourceInv.length === 0 ||
        parseFloat(sourceInv[0].quantity) < data.quantity
      ) {
        throw AppError.validation("Insufficient stock for transfer");
      }

      // Decrease source
      const newSourceQty = parseFloat(sourceInv[0].quantity) - data.quantity;
      const newSourceWeight = sourceInv[0].weight_kg
        ? parseFloat(sourceInv[0].weight_kg) - (data.weightKg ?? 0)
        : null;
      await sql`
        UPDATE inventory SET
          quantity = ${newSourceQty},
          weight_kg = ${newSourceWeight},
          updated_at = NOW()
        WHERE id = ${sourceInv[0].id}
      `;

      // Upsert destination inventory
      const destInv = await sql<
        { id: string; quantity: string; weight_kg: string | null }[]
      >`
        SELECT id, quantity, weight_kg FROM inventory
        WHERE tenant_id = ${tenantId}
          AND godown_id = ${data.destGodownId}
          AND product_id = ${data.productId}
          AND color = ${data.color}
          AND stage = ${data.stage}
          AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
      `;

      let destInventoryId: string;
      if (destInv.length > 0) {
        const newDestQty = parseFloat(destInv[0].quantity) + data.quantity;
        const newDestWeight = destInv[0].weight_kg
          ? parseFloat(destInv[0].weight_kg) + (data.weightKg ?? 0)
          : (data.weightKg ?? null);
        await sql`
          UPDATE inventory SET
            quantity = ${newDestQty},
            weight_kg = ${newDestWeight},
            updated_at = NOW()
          WHERE id = ${destInv[0].id}
        `;
        destInventoryId = destInv[0].id;
      } else {
        const inv = await sql<{ id: string }[]>`
          INSERT INTO inventory (tenant_id, godown_id, product_id, color, stage, batch_id, quantity, weight_kg)
          VALUES (${tenantId}, ${data.destGodownId}, ${data.productId}, ${data.color}, ${data.stage}, ${data.batchId ?? null}, ${data.quantity}, ${data.weightKg ?? null})
          RETURNING id
        `;
        destInventoryId = inv[0].id;
      }

      // Create transfer record
      const result = await sql<TransferRow[]>`
        INSERT INTO inter_godown_transfers (
          tenant_id, source_godown_id, dest_godown_id, product_id, color, stage,
          batch_id, quantity, weight_kg, notes, transferred_by
        ) VALUES (
          ${tenantId}, ${data.sourceGodownId}, ${data.destGodownId}, ${data.productId},
          ${data.color}, ${data.stage}, ${data.batchId ?? null},
          ${data.quantity}, ${data.weightKg ?? null}, ${data.notes ?? null}, ${userId}
        )
        RETURNING *
      `;

      // Log movements
      await sql`
        INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
        VALUES (${tenantId}, ${sourceInv[0].id}, 'transfer_out', ${data.quantity}, ${data.weightKg ?? null}, 'inter_godown_transfer', ${result[0].id}, ${userId})
      `;
      await sql`
        INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
        VALUES (${tenantId}, ${destInventoryId}, 'transfer_in', ${data.quantity}, ${data.weightKg ?? null}, 'inter_godown_transfer', ${result[0].id}, ${userId})
      `;

      return toResponse(result[0]);
    } else {
      // ── Cone transfer: no inventory adjustment ──
      const result = await sql<TransferRow[]>`
        INSERT INTO inter_godown_transfers (
          tenant_id, source_godown_id, dest_godown_id, product_id, color, stage,
          batch_id, quantity, weight_kg, notes, transferred_by
        ) VALUES (
          ${tenantId}, ${data.sourceGodownId}, ${data.destGodownId}, ${null},
          ${data.color}, ${data.stage}, ${data.batchId ?? null},
          ${data.quantity}, ${data.weightKg ?? null}, ${data.notes ?? null}, ${userId}
        )
        RETURNING *
      `;

      return toResponse(result[0]);
    }
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      sourceGodownId?: string;
      destGodownId?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM inter_godown_transfers
      WHERE tenant_id = ${tenantId}
      ${query.sourceGodownId ? sql`AND source_godown_id = ${query.sourceGodownId}` : sql``}
      ${query.destGodownId ? sql`AND dest_godown_id = ${query.destGodownId}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<TransferRow[]>`
      SELECT t.*,
        sg.name AS source_godown_name,
        dg.name AS dest_godown_name,
        p.name AS product_name
      FROM inter_godown_transfers t
      LEFT JOIN godowns sg ON sg.id = t.source_godown_id
      LEFT JOIN godowns dg ON dg.id = t.dest_godown_id
      LEFT JOIN products p ON p.id = t.product_id
      WHERE t.tenant_id = ${tenantId}
      ${query.sourceGodownId ? sql`AND t.source_godown_id = ${query.sourceGodownId}` : sql``}
      ${query.destGodownId ? sql`AND t.dest_godown_id = ${query.destGodownId}` : sql``}
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }
}
