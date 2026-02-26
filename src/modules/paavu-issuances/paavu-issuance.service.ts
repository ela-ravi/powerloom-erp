import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface PaavuIssuanceRow {
  id: string;
  tenant_id: string;
  wager_id: string;
  godown_id: string;
  total_paavu_count: string;
  total_weight_kg: string;
  issued_by: string;
  issued_at: Date;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  wager_name?: string;
  godown_name?: string;
  issued_by_name?: string;
  products?: string;
  item_count?: string;
}

interface PaavuIssuanceItemRow {
  id: string;
  tenant_id: string;
  paavu_issuance_id: string;
  godown_id: string;
  product_id: string;
  color: string;
  batch_id: string | null;
  paavu_count: string;
  weight_kg: string;
  created_at: Date;
  updated_at: Date;
  godown_name?: string;
  product_name?: string;
}

interface IssuanceItem {
  productId: string;
  color: string;
  batchId?: string;
  godownId?: string;
  paavuCount: number;
}

function toResponse(row: PaavuIssuanceRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    wagerId: row.wager_id,
    godownId: row.godown_id,
    totalPaavuCount: parseInt(row.total_paavu_count, 10),
    totalWeightKg: parseFloat(row.total_weight_kg),
    issuedBy: row.issued_by,
    issuedAt: row.issued_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    wagerName: row.wager_name ?? null,
    godownName: row.godown_name ?? null,
    issuedByName: row.issued_by_name ?? null,
    products: row.products ?? null,
    itemCount: row.item_count ? parseInt(row.item_count, 10) : 0,
  };
}

function toItemResponse(row: PaavuIssuanceItemRow) {
  return {
    id: row.id,
    paavuIssuanceId: row.paavu_issuance_id,
    godownId: row.godown_id,
    productId: row.product_id,
    color: row.color,
    batchId: row.batch_id,
    paavuCount: parseInt(row.paavu_count, 10),
    weightKg: parseFloat(row.weight_kg),
    godownName: row.godown_name ?? null,
    productName: row.product_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PaavuIssuanceService {
  async create(
    tenantId: string,
    userId: string,
    data: {
      wagerId: string;
      godownId: string;
      items: IssuanceItem[];
      notes?: string;
    },
  ) {
    // Validate wager is Type 2 or 4
    const wagerProfile = await sql<{ wager_type: number }[]>`
      SELECT wager_type FROM wager_profiles WHERE user_id = ${data.wagerId} AND tenant_id = ${tenantId}
    `;
    if (wagerProfile.length === 0) {
      throw AppError.notFound("Wager not found");
    }
    if (wagerProfile[0].wager_type !== 2 && wagerProfile[0].wager_type !== 4) {
      throw AppError.validation(
        "Paavu can only be issued to Type 2 or Type 4 wagers (oodai-only)",
      );
    }

    return await sql.begin(async (tx) => {
      let totalPaavuCount = 0;
      let totalWeightKg = 0;

      // Validate and deduct inventory for each item
      for (const item of data.items) {
        const itemGodownId = item.godownId ?? data.godownId;
        const batchCoalesce =
          item.batchId ?? "00000000-0000-0000-0000-000000000000";

        const sourceInv = await tx<
          { id: string; quantity: string; weight_kg: string | null }[]
        >`
          SELECT id, quantity, weight_kg FROM inventory
          WHERE tenant_id = ${tenantId}
            AND godown_id = ${itemGodownId}
            AND product_id = ${item.productId}
            AND color = ${item.color}
            AND stage = 'paavu'
            AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
          FOR UPDATE
        `;

        if (
          sourceInv.length === 0 ||
          parseFloat(sourceInv[0].quantity) < item.paavuCount
        ) {
          throw AppError.validation(
            `Insufficient paavu stock for ${item.color}. Available: ${sourceInv.length > 0 ? sourceInv[0].quantity : 0} paavus`,
          );
        }

        const newQty = parseFloat(sourceInv[0].quantity) - item.paavuCount;
        // Calculate weight proportionally
        const currentWeight = sourceInv[0].weight_kg
          ? parseFloat(sourceInv[0].weight_kg)
          : null;
        const currentQty = parseFloat(sourceInv[0].quantity);
        const weightPerUnit =
          currentWeight !== null && currentQty > 0
            ? currentWeight / currentQty
            : 0;
        const itemWeightKg = parseFloat(
          (weightPerUnit * item.paavuCount).toFixed(3),
        );
        const newWeight =
          currentWeight !== null ? currentWeight - itemWeightKg : null;

        await tx`
          UPDATE inventory SET
            quantity = ${newQty},
            weight_kg = ${newWeight},
            updated_at = NOW()
          WHERE id = ${sourceInv[0].id}
        `;

        totalPaavuCount += item.paavuCount;
        totalWeightKg += itemWeightKg;

        // Store computed weight for item insert
        (item as IssuanceItem & { _weightKg: number })._weightKg = itemWeightKg;
      }

      // Create parent issuance record
      const result = await tx<PaavuIssuanceRow[]>`
        INSERT INTO paavu_issuances (
          tenant_id, wager_id, godown_id,
          total_paavu_count, total_weight_kg, issued_by, notes
        ) VALUES (
          ${tenantId}, ${data.wagerId}, ${data.godownId},
          ${totalPaavuCount}, ${parseFloat(totalWeightKg.toFixed(3))}, ${userId}, ${data.notes ?? null}
        )
        RETURNING *
      `;

      const issuanceId = result[0].id;

      // Insert item rows and log inventory movements
      const insertedItems: PaavuIssuanceItemRow[] = [];
      for (const item of data.items) {
        const itemGodownId = item.godownId ?? data.godownId;
        const itemWeightKg = (item as IssuanceItem & { _weightKg: number })
          ._weightKg;
        const batchCoalesce =
          item.batchId ?? "00000000-0000-0000-0000-000000000000";

        const itemRow = await tx<PaavuIssuanceItemRow[]>`
          INSERT INTO paavu_issuance_items (
            tenant_id, paavu_issuance_id, godown_id, product_id, color, batch_id, paavu_count, weight_kg
          ) VALUES (
            ${tenantId}, ${issuanceId}, ${itemGodownId}, ${item.productId},
            ${item.color}, ${item.batchId ?? null}, ${item.paavuCount}, ${itemWeightKg}
          )
          RETURNING *
        `;
        insertedItems.push(itemRow[0]);

        // Log inventory movement
        const sourceInv = await tx<{ id: string }[]>`
          SELECT id FROM inventory
          WHERE tenant_id = ${tenantId}
            AND godown_id = ${itemGodownId}
            AND product_id = ${item.productId}
            AND color = ${item.color}
            AND stage = 'paavu'
            AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
        `;

        await tx`
          INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
          VALUES (${tenantId}, ${sourceInv[0].id}, 'decrease', ${item.paavuCount}, ${itemWeightKg}, 'paavu_issuance', ${issuanceId}, ${userId})
        `;
      }

      return {
        ...toResponse(result[0]),
        items: insertedItems.map(toItemResponse),
      };
    });
  }

  async getEligibleWagers(tenantId: string) {
    const wagers = await sql<
      { user_id: string; name: string; wager_type: number }[]
    >`
      SELECT wp.user_id, u.name, wp.wager_type
      FROM wager_profiles wp
      JOIN users u ON u.id = wp.user_id
      WHERE wp.tenant_id = ${tenantId}
        AND wp.is_active = true
        AND u.is_active = true
        AND wp.wager_type IN (2, 4)
      ORDER BY u.name
    `;

    return wagers.map((w) => ({
      userId: w.user_id,
      name: w.name,
      wagerType: w.wager_type,
    }));
  }

  async getWagerPaavuSummary(tenantId: string, wagerId: string) {
    const result = await sql<
      { total_paavu_count: string; total_weight_kg: string; product_name: string }[]
    >`
      SELECT
        COALESCE(SUM(pii.paavu_count), 0) AS total_paavu_count,
        COALESCE(SUM(pii.weight_kg), 0) AS total_weight_kg,
        p.name AS product_name
      FROM paavu_issuances pi
      JOIN paavu_issuance_items pii ON pii.paavu_issuance_id = pi.id
      LEFT JOIN products p ON p.id = pii.product_id
      WHERE pi.tenant_id = ${tenantId}
        AND pi.wager_id = ${wagerId}
      GROUP BY p.name
      ORDER BY p.name
    `;

    const totalPaavuCount = result.reduce((s, r) => s + parseInt(r.total_paavu_count, 10), 0);
    const totalWeightKg = result.reduce((s, r) => s + parseFloat(r.total_weight_kg), 0);

    return {
      totalPaavuCount,
      totalWeightKg: parseFloat(totalWeightKg.toFixed(3)),
      byProduct: result.map((r) => ({
        productName: r.product_name,
        paavuCount: parseInt(r.total_paavu_count, 10),
        weightKg: parseFloat(r.total_weight_kg),
      })),
    };
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      wagerId?: string;
      godownId?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM paavu_issuances
      WHERE tenant_id = ${tenantId}
      ${query.wagerId ? sql`AND wager_id = ${query.wagerId}` : sql``}
      ${query.godownId ? sql`AND godown_id = ${query.godownId}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<PaavuIssuanceRow[]>`
      SELECT pi.*,
        w.name AS wager_name,
        g.name AS godown_name,
        ib.name AS issued_by_name,
        items_agg.products,
        items_agg.item_count
      FROM paavu_issuances pi
      LEFT JOIN users w ON w.id = pi.wager_id
      LEFT JOIN godowns g ON g.id = pi.godown_id
      LEFT JOIN users ib ON ib.id = pi.issued_by
      LEFT JOIN LATERAL (
        SELECT
          string_agg(DISTINCT p.name, ', ' ORDER BY p.name) AS products,
          COUNT(*)::text AS item_count
        FROM paavu_issuance_items pii
        LEFT JOIN products p ON p.id = pii.product_id
        WHERE pii.paavu_issuance_id = pi.id
      ) items_agg ON true
      WHERE pi.tenant_id = ${tenantId}
      ${query.wagerId ? sql`AND pi.wager_id = ${query.wagerId}` : sql``}
      ${query.godownId ? sql`AND pi.godown_id = ${query.godownId}` : sql``}
      ORDER BY pi.issued_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async findById(tenantId: string, id: string) {
    const data = await sql<PaavuIssuanceRow[]>`
      SELECT pi.*,
        w.name AS wager_name,
        g.name AS godown_name,
        ib.name AS issued_by_name
      FROM paavu_issuances pi
      LEFT JOIN users w ON w.id = pi.wager_id
      LEFT JOIN godowns g ON g.id = pi.godown_id
      LEFT JOIN users ib ON ib.id = pi.issued_by
      WHERE pi.tenant_id = ${tenantId} AND pi.id = ${id}
    `;

    if (data.length === 0) {
      throw AppError.notFound("Paavu issuance not found");
    }

    const items = await sql<PaavuIssuanceItemRow[]>`
      SELECT pii.*, g.name AS godown_name, p.name AS product_name
      FROM paavu_issuance_items pii
      LEFT JOIN godowns g ON g.id = pii.godown_id
      LEFT JOIN products p ON p.id = pii.product_id
      WHERE pii.tenant_id = ${tenantId} AND pii.paavu_issuance_id = ${id}
      ORDER BY pii.created_at
    `;

    return {
      ...toResponse(data[0]),
      items: items.map(toItemResponse),
    };
  }
}
