import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface PaavuProductionRow {
  id: string;
  tenant_id: string;
  paavu_oati_id: string;
  godown_id: string;
  product_id: string;
  color: string;
  batch_id: string | null;
  cone_weight_kg: string;
  paavu_count: number;
  wastage_grams: string;
  wastage_flagged: boolean;
  production_date: string;
  notes: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: PaavuProductionRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    paavuOatiId: row.paavu_oati_id,
    godownId: row.godown_id,
    productId: row.product_id,
    color: row.color,
    batchId: row.batch_id,
    coneWeightKg: parseFloat(row.cone_weight_kg),
    paavuCount: row.paavu_count,
    wastageGrams: parseFloat(row.wastage_grams),
    wastageFlagged: row.wastage_flagged,
    productionDate: row.production_date,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PaavuProductionService {
  async getEligibleWorkers(tenantId: string) {
    // Active paavu_oati users
    const paavuWorkers = await sql<{ user_id: string; name: string }[]>`
      SELECT po.user_id, u.name
      FROM paavu_oati_profiles po
      JOIN users u ON u.id = po.user_id
      WHERE po.tenant_id = ${tenantId} AND po.is_active = true AND u.is_active = true
    `;

    // Active wagers
    const wagers = await sql<{ user_id: string; name: string }[]>`
      SELECT wp.user_id, u.name
      FROM wager_profiles wp
      JOIN users u ON u.id = wp.user_id
      WHERE wp.tenant_id = ${tenantId} AND wp.is_active = true AND u.is_active = true
    `;

    return [
      ...paavuWorkers.map((w) => ({
        userId: w.user_id,
        name: w.name,
        workerType: "paavu_oati" as const,
      })),
      ...wagers.map((w) => ({
        userId: w.user_id,
        name: w.name,
        workerType: "wager" as const,
      })),
    ];
  }

  async create(
    tenantId: string,
    userId: string,
    data: {
      paavuOatiId: string;
      godownId: string;
      productId: string;
      color: string;
      batchId?: string;
      coneWeightKg: number;
      paavuCount: number;
      wastageGrams?: number;
      productionDate?: string;
      notes?: string;
    },
  ) {
    const wastageGrams = data.wastageGrams ?? 0;

    // Check wastage flag against tenant limit
    const settings = await sql<{ paavu_wastage_limit_grams: number }[]>`
      SELECT paavu_wastage_limit_grams FROM tenant_settings WHERE tenant_id = ${tenantId}
    `;
    const wastageRateGrams =
      settings.length > 0 ? settings[0].paavu_wastage_limit_grams : 0;
    const expectedWastage = (data.coneWeightKg / 60) * wastageRateGrams;
    const wastageFlagged = wastageGrams > expectedWastage;

    const batchCoalesce =
      data.batchId ?? "00000000-0000-0000-0000-000000000000";

    return await sql.begin(async (tx) => {
      // 1. Find and lock raw_cone inventory for deduction
      const rawConeInv = await tx<
        { id: string; quantity: string; weight_kg: string | null }[]
      >`
        SELECT id, quantity, weight_kg FROM inventory
        WHERE tenant_id = ${tenantId}
          AND godown_id = ${data.godownId}
          AND product_id IS NULL
          AND color = ${data.color}
          AND stage = 'raw_cone'
          AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
        FOR UPDATE
      `;

      if (
        rawConeInv.length === 0 ||
        parseFloat(rawConeInv[0].quantity) < data.coneWeightKg
      ) {
        throw AppError.validation(
          `Insufficient raw cone stock for ${data.color}. Available: ${rawConeInv.length > 0 ? rawConeInv[0].quantity : 0} kg`,
        );
      }

      // 2. Deduct from raw_cone inventory
      const newRawQty =
        parseFloat(rawConeInv[0].quantity) - data.coneWeightKg;
      const newRawWeight = rawConeInv[0].weight_kg
        ? parseFloat(rawConeInv[0].weight_kg) - data.coneWeightKg
        : null;
      await tx`
        UPDATE inventory SET quantity = ${newRawQty}, weight_kg = ${newRawWeight}, updated_at = NOW()
        WHERE id = ${rawConeInv[0].id}
      `;

      // 3. Upsert inventory at paavu stage (increase paavu count)
      const existingInv = await tx<
        { id: string; quantity: string; weight_kg: string | null }[]
      >`
        SELECT id, quantity, weight_kg FROM inventory
        WHERE tenant_id = ${tenantId}
          AND godown_id = ${data.godownId}
          AND product_id = ${data.productId}
          AND color = ${data.color}
          AND stage = 'paavu'
          AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
      `;

      let inventoryId: string;
      if (existingInv.length > 0) {
        const newQty =
          parseFloat(existingInv[0].quantity) + data.paavuCount;
        const newWeight =
          (existingInv[0].weight_kg ? parseFloat(existingInv[0].weight_kg) : 0) + data.coneWeightKg;
        await tx`
          UPDATE inventory SET quantity = ${newQty}, weight_kg = ${newWeight}, updated_at = NOW()
          WHERE id = ${existingInv[0].id}
        `;
        inventoryId = existingInv[0].id;
      } else {
        const inv = await tx<{ id: string }[]>`
          INSERT INTO inventory (tenant_id, godown_id, product_id, color, stage, batch_id, quantity, weight_kg)
          VALUES (${tenantId}, ${data.godownId}, ${data.productId}, ${data.color}, 'paavu', ${data.batchId ?? null}, ${data.paavuCount}, ${data.coneWeightKg})
          RETURNING id
        `;
        inventoryId = inv[0].id;
      }

      // 4. Create paavu production record
      const result = await tx<PaavuProductionRow[]>`
        INSERT INTO paavu_productions (
          tenant_id, paavu_oati_id, godown_id, product_id, color, batch_id,
          cone_weight_kg, paavu_count, wastage_grams, wastage_flagged,
          production_date, notes, created_by
        ) VALUES (
          ${tenantId}, ${data.paavuOatiId}, ${data.godownId}, ${data.productId},
          ${data.color}, ${data.batchId ?? null},
          ${data.coneWeightKg}, ${data.paavuCount}, ${wastageGrams}, ${wastageFlagged},
          ${data.productionDate ?? new Date().toISOString().split("T")[0]},
          ${data.notes ?? null}, ${userId}
        )
        RETURNING *
      `;

      // 5. Log inventory movements — decrease raw_cone + increase paavu
      await tx`
        INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
        VALUES (${tenantId}, ${rawConeInv[0].id}, 'decrease', ${data.coneWeightKg}, ${data.coneWeightKg}, 'paavu_production', ${result[0].id}, ${userId})
      `;
      await tx`
        INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
        VALUES (${tenantId}, ${inventoryId}, 'increase', ${data.paavuCount}, NULL, 'paavu_production', ${result[0].id}, ${userId})
      `;

      return toResponse(result[0]);
    });
  }

  async findById(tenantId: string, id: string) {
    const rows = await sql<PaavuProductionRow[]>`
      SELECT * FROM paavu_productions WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (rows.length === 0) {
      throw AppError.notFound("Paavu production record not found");
    }
    return toResponse(rows[0]);
  }

  async update(
    tenantId: string,
    id: string,
    userId: string,
    data: {
      paavuOatiId?: string;
      godownId?: string;
      productId?: string;
      color?: string;
      batchId?: string;
      coneWeightKg?: number;
      paavuCount?: number;
      wastageGrams?: number;
      productionDate?: string;
      notes?: string;
    },
  ) {
    return await sql.begin(async (tx) => {
      // 1. Fetch existing record
      const existing = await tx<PaavuProductionRow[]>`
        SELECT * FROM paavu_productions WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE
      `;
      if (existing.length === 0) {
        throw AppError.notFound("Paavu production record not found");
      }
      const old = existing[0];

      const newGodownId = data.godownId ?? old.godown_id;
      const newProductId = data.productId ?? old.product_id;
      const newColor = data.color ?? old.color;
      const newBatchId = data.batchId !== undefined ? data.batchId : old.batch_id;
      const newConeWeightKg = data.coneWeightKg ?? parseFloat(old.cone_weight_kg);
      const newPaavuCount = data.paavuCount ?? old.paavu_count;
      const newWastageGrams = data.wastageGrams ?? parseFloat(old.wastage_grams);
      const newPaavuOatiId = data.paavuOatiId ?? old.paavu_oati_id;
      const newProductionDate = data.productionDate ?? old.production_date;
      const newNotes = data.notes !== undefined ? data.notes : old.notes;

      const oldBatchCoalesce = old.batch_id ?? "00000000-0000-0000-0000-000000000000";
      const newBatchCoalesce = newBatchId ?? "00000000-0000-0000-0000-000000000000";

      // 2. Reverse old raw_cone deduction — add back old.cone_weight_kg
      const oldRawConeInv = await tx<{ id: string; quantity: string; weight_kg: string | null }[]>`
        SELECT id, quantity, weight_kg FROM inventory
        WHERE tenant_id = ${tenantId}
          AND godown_id = ${old.godown_id}
          AND product_id IS NULL
          AND color = ${old.color}
          AND stage = 'raw_cone'
          AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${oldBatchCoalesce}
        FOR UPDATE
      `;
      if (oldRawConeInv.length > 0) {
        const oldConeWt = parseFloat(old.cone_weight_kg);
        const restoredQty = parseFloat(oldRawConeInv[0].quantity) + oldConeWt;
        const restoredWeight = oldRawConeInv[0].weight_kg
          ? parseFloat(oldRawConeInv[0].weight_kg) + oldConeWt
          : null;
        await tx`
          UPDATE inventory SET quantity = ${restoredQty}, weight_kg = ${restoredWeight}, updated_at = NOW()
          WHERE id = ${oldRawConeInv[0].id}
        `;
      }

      // 3. Reverse old paavu increase — subtract old.paavu_count and old.cone_weight_kg
      const oldPaavuInv = await tx<{ id: string; quantity: string; weight_kg: string | null }[]>`
        SELECT id, quantity, weight_kg FROM inventory
        WHERE tenant_id = ${tenantId}
          AND godown_id = ${old.godown_id}
          AND product_id = ${old.product_id}
          AND color = ${old.color}
          AND stage = 'paavu'
          AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${oldBatchCoalesce}
        FOR UPDATE
      `;
      if (oldPaavuInv.length > 0) {
        const reducedQty = Math.max(0, parseFloat(oldPaavuInv[0].quantity) - old.paavu_count);
        const reducedWeight = Math.max(0, (oldPaavuInv[0].weight_kg ? parseFloat(oldPaavuInv[0].weight_kg) : 0) - parseFloat(old.cone_weight_kg));
        await tx`
          UPDATE inventory SET quantity = ${reducedQty}, weight_kg = ${reducedWeight}, updated_at = NOW()
          WHERE id = ${oldPaavuInv[0].id}
        `;
      }

      // 4. Apply new raw_cone deduction — subtract newConeWeightKg
      const newRawConeInv = await tx<{ id: string; quantity: string; weight_kg: string | null }[]>`
        SELECT id, quantity, weight_kg FROM inventory
        WHERE tenant_id = ${tenantId}
          AND godown_id = ${newGodownId}
          AND product_id IS NULL
          AND color = ${newColor}
          AND stage = 'raw_cone'
          AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${newBatchCoalesce}
        FOR UPDATE
      `;

      if (newRawConeInv.length === 0 || parseFloat(newRawConeInv[0].quantity) < newConeWeightKg) {
        throw AppError.validation(
          `Insufficient raw cone stock for ${newColor}. Available: ${newRawConeInv.length > 0 ? newRawConeInv[0].quantity : 0} kg`,
        );
      }

      const deductedQty = parseFloat(newRawConeInv[0].quantity) - newConeWeightKg;
      const deductedWeight = newRawConeInv[0].weight_kg
        ? parseFloat(newRawConeInv[0].weight_kg) - newConeWeightKg
        : null;
      await tx`
        UPDATE inventory SET quantity = ${deductedQty}, weight_kg = ${deductedWeight}, updated_at = NOW()
        WHERE id = ${newRawConeInv[0].id}
      `;

      // 5. Apply new paavu increase — add newPaavuCount and newConeWeightKg
      const newPaavuInv = await tx<{ id: string; quantity: string; weight_kg: string | null }[]>`
        SELECT id, quantity, weight_kg FROM inventory
        WHERE tenant_id = ${tenantId}
          AND godown_id = ${newGodownId}
          AND product_id = ${newProductId}
          AND color = ${newColor}
          AND stage = 'paavu'
          AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${newBatchCoalesce}
      `;

      let newInventoryId: string;
      if (newPaavuInv.length > 0) {
        const addedQty = parseFloat(newPaavuInv[0].quantity) + newPaavuCount;
        const addedWeight = (newPaavuInv[0].weight_kg ? parseFloat(newPaavuInv[0].weight_kg) : 0) + newConeWeightKg;
        await tx`
          UPDATE inventory SET quantity = ${addedQty}, weight_kg = ${addedWeight}, updated_at = NOW()
          WHERE id = ${newPaavuInv[0].id}
        `;
        newInventoryId = newPaavuInv[0].id;
      } else {
        const inv = await tx<{ id: string }[]>`
          INSERT INTO inventory (tenant_id, godown_id, product_id, color, stage, batch_id, quantity, weight_kg)
          VALUES (${tenantId}, ${newGodownId}, ${newProductId}, ${newColor}, 'paavu', ${newBatchId ?? null}, ${newPaavuCount}, ${newConeWeightKg})
          RETURNING id
        `;
        newInventoryId = inv[0].id;
      }

      // 6. Recalculate wastage flag
      const settings = await tx<{ paavu_wastage_limit_grams: number }[]>`
        SELECT paavu_wastage_limit_grams FROM tenant_settings WHERE tenant_id = ${tenantId}
      `;
      const wastageRateGrams = settings.length > 0 ? settings[0].paavu_wastage_limit_grams : 0;
      const expectedWastage = (newConeWeightKg / 60) * wastageRateGrams;
      const wastageFlagged = newWastageGrams > expectedWastage;

      // 7. Update the paavu_productions record
      const result = await tx<PaavuProductionRow[]>`
        UPDATE paavu_productions SET
          paavu_oati_id = ${newPaavuOatiId},
          godown_id = ${newGodownId},
          product_id = ${newProductId},
          color = ${newColor},
          batch_id = ${newBatchId ?? null},
          cone_weight_kg = ${newConeWeightKg},
          paavu_count = ${newPaavuCount},
          wastage_grams = ${newWastageGrams},
          wastage_flagged = ${wastageFlagged},
          production_date = ${newProductionDate},
          notes = ${newNotes ?? null},
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;

      // 8. Delete old movements and log new ones
      await tx`
        DELETE FROM inventory_movements
        WHERE reference_type = 'paavu_production' AND reference_id = ${id} AND tenant_id = ${tenantId}
      `;

      await tx`
        INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
        VALUES (${tenantId}, ${newRawConeInv[0].id}, 'decrease', ${newConeWeightKg}, ${newConeWeightKg}, 'paavu_production', ${id}, ${userId})
      `;
      await tx`
        INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
        VALUES (${tenantId}, ${newInventoryId}, 'increase', ${newPaavuCount}, NULL, 'paavu_production', ${id}, ${userId})
      `;

      return toResponse(result[0]);
    });
  }

  async delete(tenantId: string, id: string) {
    return await sql.begin(async (tx) => {
      // 1. Fetch existing record
      const existing = await tx<PaavuProductionRow[]>`
        SELECT * FROM paavu_productions WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE
      `;
      if (existing.length === 0) {
        throw AppError.notFound("Paavu production record not found");
      }
      const row = existing[0];

      const batchCoalesce = row.batch_id ?? "00000000-0000-0000-0000-000000000000";

      // 2. Reverse raw_cone deduction — add back cone_weight_kg
      const rawConeInv = await tx<{ id: string; quantity: string; weight_kg: string | null }[]>`
        SELECT id, quantity, weight_kg FROM inventory
        WHERE tenant_id = ${tenantId}
          AND godown_id = ${row.godown_id}
          AND product_id IS NULL
          AND color = ${row.color}
          AND stage = 'raw_cone'
          AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
        FOR UPDATE
      `;
      if (rawConeInv.length > 0) {
        const coneWt = parseFloat(row.cone_weight_kg);
        const restoredQty = parseFloat(rawConeInv[0].quantity) + coneWt;
        const restoredWeight = rawConeInv[0].weight_kg
          ? parseFloat(rawConeInv[0].weight_kg) + coneWt
          : null;
        await tx`
          UPDATE inventory SET quantity = ${restoredQty}, weight_kg = ${restoredWeight}, updated_at = NOW()
          WHERE id = ${rawConeInv[0].id}
        `;
      }

      // 3. Reverse paavu increase — subtract paavu_count and cone_weight_kg (floor at 0)
      const paavuInv = await tx<{ id: string; quantity: string; weight_kg: string | null }[]>`
        SELECT id, quantity, weight_kg FROM inventory
        WHERE tenant_id = ${tenantId}
          AND godown_id = ${row.godown_id}
          AND product_id = ${row.product_id}
          AND color = ${row.color}
          AND stage = 'paavu'
          AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
        FOR UPDATE
      `;
      if (paavuInv.length > 0) {
        const reducedQty = Math.max(0, parseFloat(paavuInv[0].quantity) - row.paavu_count);
        const reducedWeight = Math.max(0, (paavuInv[0].weight_kg ? parseFloat(paavuInv[0].weight_kg) : 0) - parseFloat(row.cone_weight_kg));
        await tx`
          UPDATE inventory SET quantity = ${reducedQty}, weight_kg = ${reducedWeight}, updated_at = NOW()
          WHERE id = ${paavuInv[0].id}
        `;
      }

      // 4. Delete inventory movements
      await tx`
        DELETE FROM inventory_movements
        WHERE reference_type = 'paavu_production' AND reference_id = ${id} AND tenant_id = ${tenantId}
      `;

      // 5. Hard delete the record
      await tx`
        DELETE FROM paavu_productions WHERE id = ${id} AND tenant_id = ${tenantId}
      `;
    });
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      paavuOatiId?: string;
      godownId?: string;
      productId?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM paavu_productions
      WHERE tenant_id = ${tenantId}
      ${query.paavuOatiId ? sql`AND paavu_oati_id = ${query.paavuOatiId}` : sql``}
      ${query.godownId ? sql`AND godown_id = ${query.godownId}` : sql``}
      ${query.productId ? sql`AND product_id = ${query.productId}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<(PaavuProductionRow & { worker_name: string | null; godown_name: string | null; product_name: string | null })[]>`
      SELECT pp.*,
        u.name AS worker_name,
        g.name AS godown_name,
        p.name AS product_name
      FROM paavu_productions pp
      LEFT JOIN users u ON u.id = pp.paavu_oati_id
      LEFT JOIN godowns g ON g.id = pp.godown_id
      LEFT JOIN products p ON p.id = pp.product_id
      WHERE pp.tenant_id = ${tenantId}
      ${query.paavuOatiId ? sql`AND pp.paavu_oati_id = ${query.paavuOatiId}` : sql``}
      ${query.godownId ? sql`AND pp.godown_id = ${query.godownId}` : sql``}
      ${query.productId ? sql`AND pp.product_id = ${query.productId}` : sql``}
      ORDER BY pp.production_date DESC, pp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map((row) => ({
        ...toResponse(row),
        paavuOatiName: row.worker_name ?? null,
        godownName: row.godown_name ?? null,
        productName: row.product_name ?? null,
      })),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }
}
