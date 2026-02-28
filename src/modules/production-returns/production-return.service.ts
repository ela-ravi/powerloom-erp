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
  wager_name: string | null;
  loom_number: string | null;
  godown_name: string | null;
  product_name: string | null;
  batch_number: string | null;
  shift_name: string | null;
}

function toResponse(row: ProductionReturnRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    wagerId: row.wager_id,
    wagerName: row.wager_name,
    loomId: row.loom_id,
    loomName: row.loom_number,
    godownId: row.godown_id,
    godownName: row.godown_name,
    productId: row.product_id,
    productName: row.product_name,
    color: row.color,
    batchId: row.batch_id,
    batchName: row.batch_number,
    shiftId: row.shift_id,
    shiftName: row.shift_name,
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
  async getWagerContext(tenantId: string, wagerId: string) {
    const [wagerProfile, assignedLooms, recentCombos, issuedColors] = await Promise.all([
      sql<{ wager_type_id: string; wage_basis: string; loom_ownership: string; work_scope: string }[]>`
        SELECT wp.wager_type_id, wt.wage_basis, wt.loom_ownership, wt.work_scope
        FROM wager_profiles wp
        JOIN wager_types wt ON wt.id = wp.wager_type_id
        WHERE wp.user_id = ${wagerId} AND wp.tenant_id = ${tenantId}
      `,
      sql<{ id: string; loom_number: string; loom_type_name: string | null }[]>`
        SELECT l.id, l.loom_number, lt.name AS loom_type_name
        FROM looms l
        LEFT JOIN loom_types lt ON lt.id = l.loom_type_id
        WHERE l.assigned_wager_id = ${wagerId} AND l.tenant_id = ${tenantId} AND l.is_active = true
        ORDER BY l.loom_number
      `,
      sql<{
        product_id: string; product_name: string | null;
        color: string;
        godown_id: string; godown_name: string | null;
        batch_id: string | null; batch_number: string | null;
      }[]>`
        SELECT DISTINCT ON (pr.product_id, pr.color, pr.godown_id)
          pr.product_id, p.name AS product_name,
          pr.color,
          pr.godown_id, g.name AS godown_name,
          pr.batch_id, b.batch_number
        FROM production_returns pr
        LEFT JOIN products p ON p.id = pr.product_id
        LEFT JOIN godowns g ON g.id = pr.godown_id
        LEFT JOIN batches b ON b.id = pr.batch_id
        WHERE pr.wager_id = ${wagerId} AND pr.tenant_id = ${tenantId}
        ORDER BY pr.product_id, pr.color, pr.godown_id, pr.return_date DESC
        LIMIT 30
      `,
      sql<{ color: string }[]>`
        SELECT DISTINCT cii.color
        FROM cone_issuance_items cii
        JOIN cone_issuances ci ON ci.id = cii.cone_issuance_id
        WHERE ci.wager_id = ${wagerId} AND ci.tenant_id = ${tenantId}
        ORDER BY cii.color
      `,
    ]);

    if (wagerProfile.length === 0) {
      throw AppError.notFound("Wager profile not found");
    }

    return {
      wagerTypeId: wagerProfile[0].wager_type_id,
      wageBasis: wagerProfile[0].wage_basis,
      loomOwnership: wagerProfile[0].loom_ownership,
      workScope: wagerProfile[0].work_scope,
      assignedLooms: assignedLooms.map((l) => ({
        id: l.id,
        loomNumber: l.loom_number,
        loomTypeName: l.loom_type_name,
      })),
      recentCombos: recentCombos.map((r) => ({
        productId: r.product_id,
        productName: r.product_name,
        color: r.color,
        godownId: r.godown_id,
        godownName: r.godown_name,
        batchId: r.batch_id,
        batchNumber: r.batch_number,
      })),
      issuedColors: issuedColors.map((r) => r.color),
    };
  }

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
    // Get wager profile to determine type properties
    const wagerProfile = await sql<{ wage_basis: string; work_scope: string }[]>`
      SELECT wt.wage_basis, wt.work_scope
      FROM wager_profiles wp
      JOIN wager_types wt ON wt.id = wp.wager_type_id
      WHERE wp.user_id = ${data.wagerId} AND wp.tenant_id = ${tenantId}
    `;
    if (wagerProfile.length === 0) {
      throw AppError.validation("Wager profile not found");
    }

    const { wage_basis: wageBasis } = wagerProfile[0];

    // Validate based on wage basis
    if (wageBasis === "per_kg" && !data.weightKg) {
      throw AppError.validation(
        "Weight is mandatory for per-kg wagers (Paavu + Oodai)",
      );
    }
    if (wageBasis === "per_piece" && !data.pieceCount) {
      throw AppError.validation(
        "Piece count is mandatory for per-piece wagers (Oodai only)",
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

  async update(
    tenantId: string,
    returnId: string,
    userId: string,
    data: {
      loomId?: string;
      godownId?: string;
      productId?: string;
      color?: string;
      batchId?: string | null;
      shiftId?: string | null;
      pieceCount?: number | null;
      weightKg?: number | null;
      returnDate?: string;
      notes?: string | null;
    },
  ) {
    // Fetch existing record
    const existing = await sql<ProductionReturnRow[]>`
      SELECT * FROM production_returns
      WHERE id = ${returnId} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Production return not found");
    }
    const old = existing[0];

    // Determine new values (merge with existing)
    const newGodownId = data.godownId ?? old.godown_id;
    const newProductId = data.productId ?? old.product_id;
    const newColor = data.color ?? old.color;
    const newBatchId = data.batchId !== undefined ? data.batchId : old.batch_id;
    const newPieceCount = data.pieceCount !== undefined ? data.pieceCount : old.piece_count;
    const newWeightKg = data.weightKg !== undefined ? data.weightKg : (old.weight_kg ? parseFloat(old.weight_kg) : null);

    // Validate shift_id if provided
    if (data.shiftId !== undefined && data.shiftId !== null) {
      const settings = await sql<{ shift_enabled: boolean }[]>`
        SELECT shift_enabled FROM tenant_settings WHERE tenant_id = ${tenantId}
      `;
      if (settings.length === 0 || !settings[0].shift_enabled) {
        throw AppError.validation("Cannot use shift_id when shift tracking is disabled");
      }
      const shift = await sql`SELECT id FROM shifts WHERE id = ${data.shiftId} AND tenant_id = ${tenantId}`;
      if (shift.length === 0) {
        throw AppError.validation("Shift not found");
      }
    }

    // Reverse old inventory
    const oldBatchCoalesce = old.batch_id ?? "00000000-0000-0000-0000-000000000000";
    const oldInv = await sql<{ id: string; quantity: string; weight_kg: string | null }[]>`
      SELECT id, quantity, weight_kg FROM inventory
      WHERE tenant_id = ${tenantId}
        AND godown_id = ${old.godown_id}
        AND product_id = ${old.product_id}
        AND color = ${old.color}
        AND stage = 'woven'
        AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${oldBatchCoalesce}
    `;
    if (oldInv.length > 0) {
      const oldQtyToRemove = old.piece_count ?? 0;
      const oldWeightToRemove = old.weight_kg ? parseFloat(old.weight_kg) : 0;
      const newQty = Math.max(0, parseFloat(oldInv[0].quantity) - oldQtyToRemove);
      const newWeight = oldInv[0].weight_kg
        ? Math.max(0, parseFloat(oldInv[0].weight_kg) - oldWeightToRemove)
        : null;
      await sql`
        UPDATE inventory SET quantity = ${newQty}, weight_kg = ${newWeight}, updated_at = NOW()
        WHERE id = ${oldInv[0].id}
      `;
      await sql`
        INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
        VALUES (${tenantId}, ${oldInv[0].id}, 'decrease', ${oldQtyToRemove}, ${oldWeightToRemove > 0 ? oldWeightToRemove : null}, 'production_return_edit', ${returnId}, ${userId})
      `;
    }

    // Apply new inventory
    const newBatchCoalesce = newBatchId ?? "00000000-0000-0000-0000-000000000000";
    const newInv = await sql<{ id: string; quantity: string; weight_kg: string | null }[]>`
      SELECT id, quantity, weight_kg FROM inventory
      WHERE tenant_id = ${tenantId}
        AND godown_id = ${newGodownId}
        AND product_id = ${newProductId}
        AND color = ${newColor}
        AND stage = 'woven'
        AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${newBatchCoalesce}
    `;

    const quantityToAdd = newPieceCount ?? 0;
    const weightToAdd = newWeightKg ?? 0;

    let inventoryId: string;
    if (newInv.length > 0) {
      const updQty = parseFloat(newInv[0].quantity) + quantityToAdd;
      const updWeight = newInv[0].weight_kg
        ? parseFloat(newInv[0].weight_kg) + weightToAdd
        : weightToAdd > 0 ? weightToAdd : null;
      await sql`
        UPDATE inventory SET quantity = ${updQty}, weight_kg = ${updWeight}, updated_at = NOW()
        WHERE id = ${newInv[0].id}
      `;
      inventoryId = newInv[0].id;
    } else {
      const inv = await sql<{ id: string }[]>`
        INSERT INTO inventory (tenant_id, godown_id, product_id, color, stage, batch_id, quantity, weight_kg)
        VALUES (${tenantId}, ${newGodownId}, ${newProductId}, ${newColor}, 'woven', ${newBatchId ?? null}, ${quantityToAdd}, ${weightToAdd > 0 ? weightToAdd : null})
        RETURNING id
      `;
      inventoryId = inv[0].id;
    }

    await sql`
      INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
      VALUES (${tenantId}, ${inventoryId}, 'increase', ${quantityToAdd}, ${weightToAdd > 0 ? weightToAdd : null}, 'production_return_edit', ${returnId}, ${userId})
    `;

    // Update the production return record
    const newShiftId = data.shiftId !== undefined ? data.shiftId : old.shift_id;
    const result = await sql<ProductionReturnRow[]>`
      UPDATE production_returns SET
        loom_id = ${data.loomId ?? old.loom_id},
        godown_id = ${newGodownId},
        product_id = ${newProductId},
        color = ${newColor},
        batch_id = ${newBatchId},
        shift_id = ${newShiftId},
        piece_count = ${newPieceCount},
        weight_kg = ${newWeightKg},
        return_date = ${data.returnDate ?? old.return_date},
        notes = ${data.notes !== undefined ? data.notes : old.notes},
        updated_at = NOW()
      WHERE id = ${returnId} AND tenant_id = ${tenantId}
      RETURNING *,
        (SELECT name FROM users WHERE id = production_returns.wager_id) AS wager_name,
        (SELECT loom_number FROM looms WHERE id = production_returns.loom_id) AS loom_number,
        (SELECT name FROM godowns WHERE id = production_returns.godown_id) AS godown_name,
        (SELECT name FROM products WHERE id = production_returns.product_id) AS product_name,
        (SELECT batch_number FROM batches WHERE id = production_returns.batch_id) AS batch_number,
        (SELECT name FROM shifts WHERE id = production_returns.shift_id) AS shift_name
    `;

    return toResponse(result[0]);
  }

  async delete(tenantId: string, returnId: string, userId: string) {
    // Fetch existing record
    const existing = await sql<ProductionReturnRow[]>`
      SELECT * FROM production_returns
      WHERE id = ${returnId} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Production return not found");
    }
    const old = existing[0];

    // Reverse inventory
    const batchCoalesce = old.batch_id ?? "00000000-0000-0000-0000-000000000000";
    const inv = await sql<{ id: string; quantity: string; weight_kg: string | null }[]>`
      SELECT id, quantity, weight_kg FROM inventory
      WHERE tenant_id = ${tenantId}
        AND godown_id = ${old.godown_id}
        AND product_id = ${old.product_id}
        AND color = ${old.color}
        AND stage = 'woven'
        AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
    `;

    if (inv.length > 0) {
      const qtyToRemove = old.piece_count ?? 0;
      const weightToRemove = old.weight_kg ? parseFloat(old.weight_kg) : 0;
      const newQty = Math.max(0, parseFloat(inv[0].quantity) - qtyToRemove);
      const newWeight = inv[0].weight_kg
        ? Math.max(0, parseFloat(inv[0].weight_kg) - weightToRemove)
        : null;
      await sql`
        UPDATE inventory SET quantity = ${newQty}, weight_kg = ${newWeight}, updated_at = NOW()
        WHERE id = ${inv[0].id}
      `;
      await sql`
        INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
        VALUES (${tenantId}, ${inv[0].id}, 'decrease', ${qtyToRemove}, ${weightToRemove > 0 ? weightToRemove : null}, 'production_return_delete', ${returnId}, ${userId})
      `;
    }

    // Delete the production return record
    await sql`
      DELETE FROM production_returns
      WHERE id = ${returnId} AND tenant_id = ${tenantId}
    `;
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
      SELECT COUNT(*) as count FROM production_returns pr
      WHERE pr.tenant_id = ${tenantId}
      ${query.wagerId ? sql`AND pr.wager_id = ${query.wagerId}` : sql``}
      ${query.loomId ? sql`AND pr.loom_id = ${query.loomId}` : sql``}
      ${query.productId ? sql`AND pr.product_id = ${query.productId}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<ProductionReturnRow[]>`
      SELECT pr.*,
        u.name AS wager_name,
        l.loom_number,
        g.name AS godown_name,
        p.name AS product_name,
        b.batch_number,
        s.name AS shift_name
      FROM production_returns pr
      LEFT JOIN users u ON u.id = pr.wager_id
      LEFT JOIN looms l ON l.id = pr.loom_id
      LEFT JOIN godowns g ON g.id = pr.godown_id
      LEFT JOIN products p ON p.id = pr.product_id
      LEFT JOIN batches b ON b.id = pr.batch_id
      LEFT JOIN shifts s ON s.id = pr.shift_id
      WHERE pr.tenant_id = ${tenantId}
      ${query.wagerId ? sql`AND pr.wager_id = ${query.wagerId}` : sql``}
      ${query.loomId ? sql`AND pr.loom_id = ${query.loomId}` : sql``}
      ${query.productId ? sql`AND pr.product_id = ${query.productId}` : sql``}
      ORDER BY pr.return_date DESC, pr.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }
}
