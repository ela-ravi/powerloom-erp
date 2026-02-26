import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface InventoryRow {
  id: string;
  tenant_id: string;
  godown_id: string;
  product_id: string | null;
  color: string;
  stage: string;
  batch_id: string | null;
  quantity: string;
  weight_kg: string | null;
  created_at: Date;
  updated_at: Date;
  godown_name?: string;
  product_name?: string;
  batch_name?: string;
}

interface MovementRow {
  id: string;
  tenant_id: string;
  inventory_id: string;
  movement_type: string;
  quantity_change: string;
  weight_change_kg: string | null;
  reference_type: string;
  reference_id: string;
  notes: string | null;
  created_by: string;
  created_at: Date;
}

function toInventoryResponse(row: InventoryRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    godownId: row.godown_id,
    productId: row.product_id,
    color: row.color,
    stage: row.stage,
    batchId: row.batch_id,
    quantity: parseFloat(row.quantity),
    weightKg: row.weight_kg ? parseFloat(row.weight_kg) : null,
    godownName: row.godown_name ?? null,
    productName: row.product_name ?? null,
    batchName: row.batch_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMovementResponse(row: MovementRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    inventoryId: row.inventory_id,
    movementType: row.movement_type,
    quantityChange: parseFloat(row.quantity_change),
    weightChangeKg: row.weight_change_kg
      ? parseFloat(row.weight_change_kg)
      : null,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class InventoryService {
  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      godownId?: string;
      productId?: string;
      color?: string;
      stage?: string;
      batchId?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const searchTerm = query.search ? `%${query.search}%` : null;

    const filters = sql`
      WHERE i.tenant_id = ${tenantId}
      ${query.godownId ? sql`AND i.godown_id = ${query.godownId}` : sql``}
      ${query.productId ? sql`AND i.product_id = ${query.productId}` : sql``}
      ${query.color ? sql`AND i.color = ${query.color}` : sql``}
      ${query.stage ? sql`AND i.stage = ${query.stage}` : sql``}
      ${query.batchId ? sql`AND i.batch_id = ${query.batchId}` : sql``}
      ${searchTerm ? sql`AND (
        g.name ILIKE ${searchTerm}
        OR p.name ILIKE ${searchTerm}
        OR i.color ILIKE ${searchTerm}
        OR i.stage ILIKE ${searchTerm}
      )` : sql``}
    `;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM inventory i
      LEFT JOIN godowns g ON g.id = i.godown_id
      LEFT JOIN products p ON p.id = i.product_id
      ${filters}
    `;
    const total = parseInt(countResult[0].count, 10);

    // Whitelist sortable columns (safe from injection)
    const sortMap: Record<string, string> = {
      godownName: "g.name",
      productName: "p.name",
      color: "i.color",
      stage: "i.stage",
      quantity: "i.quantity",
      weightKg: "i.weight_kg",
    };
    const orderCol = sortMap[query.sortBy ?? ""] ?? "i.stage";
    const orderDir = query.sortOrder === "desc" ? "DESC" : "ASC";

    const data = await sql<InventoryRow[]>`
      SELECT i.*, g.name AS godown_name, p.name AS product_name, b.batch_number AS batch_name
      FROM inventory i
      LEFT JOIN godowns g ON g.id = i.godown_id
      LEFT JOIN products p ON p.id = i.product_id
      LEFT JOIN batches b ON b.id = i.batch_id
      ${filters}
      ORDER BY ${sql.unsafe(orderCol + " " + orderDir)}, i.color ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toInventoryResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async getSummary(
    tenantId: string,
    query: { godownId?: string; productId?: string } = {},
  ) {
    const data = await sql<
      { stage: string; total_quantity: string; total_weight_kg: string }[]
    >`
      SELECT stage,
        COALESCE(SUM(quantity), 0) as total_quantity,
        COALESCE(SUM(weight_kg), 0) as total_weight_kg
      FROM inventory
      WHERE tenant_id = ${tenantId}
      ${query.godownId ? sql`AND godown_id = ${query.godownId}` : sql``}
      ${query.productId ? sql`AND product_id = ${query.productId}` : sql``}
      GROUP BY stage
      ORDER BY stage
    `;

    return data.map((row) => ({
      stage: row.stage,
      totalQuantity: parseFloat(row.total_quantity),
      totalWeightKg: parseFloat(row.total_weight_kg),
    }));
  }

  async getAllMovements(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      movementType?: string;
      referenceType?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM inventory_movements im
      WHERE im.tenant_id = ${tenantId}
      ${query.movementType ? sql`AND im.movement_type = ${query.movementType}` : sql``}
      ${query.referenceType ? sql`AND im.reference_type = ${query.referenceType}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<
      (MovementRow & {
        godown_name?: string;
        product_name?: string;
        color?: string;
        stage?: string;
      })[]
    >`
      SELECT im.*, g.name AS godown_name, p.name AS product_name, i.color, i.stage
      FROM inventory_movements im
      LEFT JOIN inventory i ON i.id = im.inventory_id
      LEFT JOIN godowns g ON g.id = i.godown_id
      LEFT JOIN products p ON p.id = i.product_id
      WHERE im.tenant_id = ${tenantId}
      ${query.movementType ? sql`AND im.movement_type = ${query.movementType}` : sql``}
      ${query.referenceType ? sql`AND im.reference_type = ${query.referenceType}` : sql``}
      ORDER BY im.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map((row) => ({
        ...toMovementResponse(row),
        godownName: row.godown_name ?? null,
        productName: row.product_name ?? null,
        color: row.color ?? null,
        stage: row.stage ?? null,
      })),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async getAvailableStock(
    tenantId: string,
    query: { godownId: string; stage?: string },
  ) {
    const stage = query.stage ?? "raw_cone";

    const data = await sql<
      { product_id: string | null; product_name: string | null; color: string; quantity: string; weight_kg: string }[]
    >`
      SELECT i.product_id, p.name as product_name, i.color,
        COALESCE(SUM(i.quantity), 0) as quantity,
        COALESCE(SUM(i.weight_kg), 0) as weight_kg
      FROM inventory i
      LEFT JOIN products p ON p.id = i.product_id
      WHERE i.tenant_id = ${tenantId}
        AND i.godown_id = ${query.godownId}
        AND i.stage = ${stage}
        AND i.quantity > 0
      GROUP BY i.product_id, p.name, i.color
      ORDER BY p.name, i.color
    `;

    return data.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      color: row.color,
      availableQty: parseFloat(row.quantity),
      availableWeightKg: parseFloat(row.weight_kg),
    }));
  }

  async getMovements(
    tenantId: string,
    inventoryId: string,
    query: { limit?: number; offset?: number } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    // Verify inventory exists
    const inv = await sql<InventoryRow[]>`
      SELECT id FROM inventory WHERE id = ${inventoryId} AND tenant_id = ${tenantId}
    `;
    if (inv.length === 0) {
      throw AppError.notFound("Inventory record not found");
    }

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM inventory_movements
      WHERE inventory_id = ${inventoryId} AND tenant_id = ${tenantId}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<MovementRow[]>`
      SELECT * FROM inventory_movements
      WHERE inventory_id = ${inventoryId} AND tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toMovementResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }
}
