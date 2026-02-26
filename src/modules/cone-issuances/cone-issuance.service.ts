import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface ConeIssuanceRow {
  id: string;
  tenant_id: string;
  wager_id: string;
  godown_id: string;
  total_quantity_kg: string;
  issued_by: string;
  issued_at: Date;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  wager_name?: string;
  godown_name?: string;
  issued_by_name?: string;
  colors?: string;
  item_count?: string;
}

interface ConeIssuanceItemRow {
  id: string;
  tenant_id: string;
  cone_issuance_id: string;
  godown_id: string;
  color: string;
  batch_id: string | null;
  quantity_kg: string;
  created_at: Date;
  updated_at: Date;
  godown_name?: string;
}

interface IssuanceItem {
  color: string;
  batchId?: string;
  godownId?: string;
  quantityKg: number;
}

function toResponse(row: ConeIssuanceRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    wagerId: row.wager_id,
    godownId: row.godown_id,
    totalQuantityKg: parseFloat(row.total_quantity_kg),
    issuedBy: row.issued_by,
    issuedAt: row.issued_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    wagerName: row.wager_name ?? null,
    godownName: row.godown_name ?? null,
    issuedByName: row.issued_by_name ?? null,
    colors: row.colors ?? null,
    itemCount: row.item_count ? parseInt(row.item_count, 10) : 0,
  };
}

function toItemResponse(row: ConeIssuanceItemRow) {
  return {
    id: row.id,
    coneIssuanceId: row.cone_issuance_id,
    godownId: row.godown_id,
    color: row.color,
    batchId: row.batch_id,
    quantityKg: parseFloat(row.quantity_kg),
    godownName: row.godown_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ConeIssuanceService {
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
    const totalQuantityKg = data.items.reduce(
      (sum, item) => sum + item.quantityKg,
      0,
    );

    return await sql.begin(async (tx) => {
      // Validate inventory for each item
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
            AND product_id IS NULL
            AND color = ${item.color}
            AND stage = 'raw_cone'
            AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
          FOR UPDATE
        `;

        if (
          sourceInv.length === 0 ||
          parseFloat(sourceInv[0].quantity) < item.quantityKg
        ) {
          throw AppError.validation(
            `Insufficient raw cone stock for ${item.color}. Available: ${sourceInv.length > 0 ? sourceInv[0].quantity : 0} kg`,
          );
        }

        // Decrease raw_cone inventory
        const newQty = parseFloat(sourceInv[0].quantity) - item.quantityKg;
        const newWeight = sourceInv[0].weight_kg
          ? parseFloat(sourceInv[0].weight_kg) - item.quantityKg
          : null;
        await tx`
          UPDATE inventory SET
            quantity = ${newQty},
            weight_kg = ${newWeight},
            updated_at = NOW()
          WHERE id = ${sourceInv[0].id}
        `;
      }

      // Create parent issuance record
      const result = await tx<ConeIssuanceRow[]>`
        INSERT INTO cone_issuances (
          tenant_id, wager_id, godown_id,
          total_quantity_kg, issued_by, notes
        ) VALUES (
          ${tenantId}, ${data.wagerId}, ${data.godownId},
          ${totalQuantityKg}, ${userId}, ${data.notes ?? null}
        )
        RETURNING *
      `;

      const issuanceId = result[0].id;

      // Insert item rows and log inventory movements
      const insertedItems: ConeIssuanceItemRow[] = [];
      for (const item of data.items) {
        const itemGodownId = item.godownId ?? data.godownId;
        const batchCoalesce =
          item.batchId ?? "00000000-0000-0000-0000-000000000000";

        const itemRow = await tx<ConeIssuanceItemRow[]>`
          INSERT INTO cone_issuance_items (
            tenant_id, cone_issuance_id, godown_id, color, batch_id, quantity_kg
          ) VALUES (
            ${tenantId}, ${issuanceId}, ${itemGodownId}, ${item.color},
            ${item.batchId ?? null}, ${item.quantityKg}
          )
          RETURNING *
        `;
        insertedItems.push(itemRow[0]);

        // Look up the inventory row again for the movement log
        const sourceInv = await tx<{ id: string }[]>`
          SELECT id FROM inventory
          WHERE tenant_id = ${tenantId}
            AND godown_id = ${itemGodownId}
            AND product_id IS NULL
            AND color = ${item.color}
            AND stage = 'raw_cone'
            AND COALESCE(batch_id, '00000000-0000-0000-0000-000000000000') = ${batchCoalesce}
        `;

        await tx`
          INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
          VALUES (${tenantId}, ${sourceInv[0].id}, 'decrease', ${item.quantityKg}, ${item.quantityKg}, 'cone_issuance', ${issuanceId}, ${userId})
        `;
      }

      return {
        ...toResponse(result[0]),
        items: insertedItems.map(toItemResponse),
      };
    });
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
      SELECT COUNT(*) as count FROM cone_issuances
      WHERE tenant_id = ${tenantId}
      ${query.wagerId ? sql`AND wager_id = ${query.wagerId}` : sql``}
      ${query.godownId ? sql`AND godown_id = ${query.godownId}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<ConeIssuanceRow[]>`
      SELECT ci.*,
        w.name AS wager_name,
        g.name AS godown_name,
        ib.name AS issued_by_name,
        items_agg.colors,
        items_agg.item_count
      FROM cone_issuances ci
      LEFT JOIN users w ON w.id = ci.wager_id
      LEFT JOIN godowns g ON g.id = ci.godown_id
      LEFT JOIN users ib ON ib.id = ci.issued_by
      LEFT JOIN LATERAL (
        SELECT
          string_agg(DISTINCT cii.color, ', ' ORDER BY cii.color) AS colors,
          COUNT(*)::text AS item_count
        FROM cone_issuance_items cii
        WHERE cii.cone_issuance_id = ci.id
      ) items_agg ON true
      WHERE ci.tenant_id = ${tenantId}
      ${query.wagerId ? sql`AND ci.wager_id = ${query.wagerId}` : sql``}
      ${query.godownId ? sql`AND ci.godown_id = ${query.godownId}` : sql``}
      ORDER BY ci.issued_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async findById(tenantId: string, id: string) {
    const data = await sql<ConeIssuanceRow[]>`
      SELECT ci.*,
        w.name AS wager_name,
        g.name AS godown_name,
        ib.name AS issued_by_name
      FROM cone_issuances ci
      LEFT JOIN users w ON w.id = ci.wager_id
      LEFT JOIN godowns g ON g.id = ci.godown_id
      LEFT JOIN users ib ON ib.id = ci.issued_by
      WHERE ci.tenant_id = ${tenantId} AND ci.id = ${id}
    `;

    if (data.length === 0) {
      throw AppError.notFound("Cone issuance not found");
    }

    const items = await sql<ConeIssuanceItemRow[]>`
      SELECT cii.*, g.name AS godown_name
      FROM cone_issuance_items cii
      LEFT JOIN godowns g ON g.id = cii.godown_id
      WHERE cii.tenant_id = ${tenantId} AND cii.cone_issuance_id = ${id}
      ORDER BY cii.created_at
    `;

    return {
      ...toResponse(data[0]),
      items: items.map(toItemResponse),
    };
  }
}
