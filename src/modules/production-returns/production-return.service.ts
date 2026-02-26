import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface ProductionReturnRow {
  id: string;
  tenant_id: string;
  wager_id: string;
  loom_id: string;
  godown_id: string;
  product_id: string;
  color: string;
  batch_id: string | null;
  shift_id: string | null;
  piece_count: number | null;
  weight_kg: string | null;
  wastage_kg: string;
  wastage_flagged: boolean;
  return_date: string;
  notes: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: ProductionReturnRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    wagerId: row.wager_id,
    loomId: row.loom_id,
    godownId: row.godown_id,
    productId: row.product_id,
    color: row.color,
    batchId: row.batch_id,
    shiftId: row.shift_id,
    pieceCount: row.piece_count,
    weightKg: row.weight_kg ? parseFloat(row.weight_kg) : null,
    wastageKg: parseFloat(row.wastage_kg),
    wastageFlagged: row.wastage_flagged,
    returnDate: row.return_date,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProductionReturnService {
  async create(
    tenantId: string,
    userId: string,
    data: {
      wagerId: string;
      loomId: string;
      godownId: string;
      productId: string;
      color: string;
      batchId?: string;
      shiftId?: string;
      pieceCount?: number;
      weightKg?: number;
      wastageKg?: number;
      returnDate?: string;
      notes?: string;
    },
  ) {
    // Get wager profile to determine type
    const wagerProfile = await sql<{ wager_type: number }[]>`
      SELECT wager_type FROM wager_profiles WHERE user_id = ${data.wagerId} AND tenant_id = ${tenantId}
    `;
    if (wagerProfile.length === 0) {
      throw AppError.validation("Wager profile not found");
    }

    const wagerType = wagerProfile[0].wager_type;

    // Validate based on wager type
    // Type 1/3: Paavu + Oodai → weight_kg mandatory
    if ([1, 3].includes(wagerType) && !data.weightKg) {
      throw AppError.validation(
        "Weight is mandatory for Type 1/3 wagers (Paavu + Oodai)",
      );
    }
    // Type 2/4: Oodai only → piece_count mandatory
    if ([2, 4].includes(wagerType) && !data.pieceCount) {
      throw AppError.validation(
        "Piece count is mandatory for Type 2/4 wagers (Oodai only)",
      );
    }

    // Validate shift_id against feature flag
    if (data.shiftId) {
      const settings = await sql<{ shift_enabled: boolean }[]>`
        SELECT shift_enabled FROM tenant_settings WHERE tenant_id = ${tenantId}
      `;
      if (settings.length === 0 || !settings[0].shift_enabled) {
        throw AppError.validation(
          "Cannot use shift_id when shift tracking is disabled",
        );
      }
      // Verify shift exists
      const shift = await sql`
        SELECT id FROM shifts WHERE id = ${data.shiftId} AND tenant_id = ${tenantId}
      `;
      if (shift.length === 0) {
        throw AppError.validation("Shift not found");
      }
    }

    const wastageKg = data.wastageKg ?? 0;
    const wastageFlagged = false; // Could implement a wastage threshold check

    // Upsert woven stage inventory
    const batchCoalesce =
      data.batchId ?? "00000000-0000-0000-0000-000000000000";
    const existingInv = await sql<
      { id: string; quantity: string; weight_kg: string | null }[]
    >`
      SELECT id, quantity, weight_kg FROM inventory
      WHERE tenant_id = ${tenantId}
        AND godown_id = ${data.godownId}
        AND product_id = ${data.productId}
        AND color = ${data.color}
        AND stage = 'woven'
        AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
    `;

    const quantityToAdd = data.pieceCount ?? 0;
    const weightToAdd = data.weightKg ?? 0;

    let inventoryId: string;
    if (existingInv.length > 0) {
      const newQty = parseFloat(existingInv[0].quantity) + quantityToAdd;
      const newWeight = existingInv[0].weight_kg
        ? parseFloat(existingInv[0].weight_kg) + weightToAdd
        : weightToAdd > 0
          ? weightToAdd
          : null;
      await sql`
        UPDATE inventory SET
          quantity = ${newQty},
          weight_kg = ${newWeight},
          updated_at = NOW()
        WHERE id = ${existingInv[0].id}
      `;
      inventoryId = existingInv[0].id;
    } else {
      const inv = await sql<{ id: string }[]>`
        INSERT INTO inventory (tenant_id, godown_id, product_id, color, stage, batch_id, quantity, weight_kg)
        VALUES (${tenantId}, ${data.godownId}, ${data.productId}, ${data.color}, 'woven', ${data.batchId ?? null}, ${quantityToAdd}, ${weightToAdd > 0 ? weightToAdd : null})
        RETURNING id
      `;
      inventoryId = inv[0].id;
    }

    // Create production return record
    const result = await sql<ProductionReturnRow[]>`
      INSERT INTO production_returns (
        tenant_id, wager_id, loom_id, godown_id, product_id, color, batch_id,
        shift_id, piece_count, weight_kg, wastage_kg, wastage_flagged,
        return_date, notes, created_by
      ) VALUES (
        ${tenantId}, ${data.wagerId}, ${data.loomId}, ${data.godownId}, ${data.productId},
        ${data.color}, ${data.batchId ?? null},
        ${data.shiftId ?? null}, ${data.pieceCount ?? null}, ${data.weightKg ?? null},
        ${wastageKg}, ${wastageFlagged},
        ${data.returnDate ?? new Date().toISOString().split("T")[0]},
        ${data.notes ?? null}, ${userId}
      )
      RETURNING *
    `;

    // Log inventory movement
    await sql`
      INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
      VALUES (${tenantId}, ${inventoryId}, 'increase', ${quantityToAdd}, ${weightToAdd > 0 ? weightToAdd : null}, 'production_return', ${result[0].id}, ${userId})
    `;

    // Color substitution detection (fire-and-forget)
    this.detectColorSubstitution(tenantId, data).catch(() => {
      // Silently ignore — fraud alert is non-blocking
    });

    return toResponse(result[0]);
  }

  private async detectColorSubstitution(
    tenantId: string,
    data: {
      wagerId: string;
      productId: string;
      color: string;
      batchId?: string;
    },
  ) {
    // Find the most recent cone issuance for this wager + product (+ batch if applicable)
    const batchCondition = data.batchId
      ? sql`AND batch_id = ${data.batchId}`
      : sql`AND batch_id IS NULL`;

    const issuance = await sql<{ color: string }[]>`
      SELECT color FROM cone_issuances
      WHERE tenant_id = ${tenantId}
        AND wager_id = ${data.wagerId}
        AND product_id = ${data.productId}
        ${batchCondition}
      ORDER BY issued_at DESC
      LIMIT 1
    `;

    if (issuance.length > 0 && issuance[0].color !== data.color) {
      // Log a fraud alert (simplified — just a log entry for now)
      // In a full implementation, this would create a fraud_alerts record
      console.warn(
        `[FRAUD ALERT] Color substitution detected for wager ${data.wagerId}: issued=${issuance[0].color}, returned=${data.color}`,
      );
    }
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      wagerId?: string;
      loomId?: string;
      productId?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM production_returns
      WHERE tenant_id = ${tenantId}
      ${query.wagerId ? sql`AND wager_id = ${query.wagerId}` : sql``}
      ${query.loomId ? sql`AND loom_id = ${query.loomId}` : sql``}
      ${query.productId ? sql`AND product_id = ${query.productId}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<ProductionReturnRow[]>`
      SELECT * FROM production_returns
      WHERE tenant_id = ${tenantId}
      ${query.wagerId ? sql`AND wager_id = ${query.wagerId}` : sql``}
      ${query.loomId ? sql`AND loom_id = ${query.loomId}` : sql``}
      ${query.productId ? sql`AND product_id = ${query.productId}` : sql``}
      ORDER BY return_date DESC, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }
}
