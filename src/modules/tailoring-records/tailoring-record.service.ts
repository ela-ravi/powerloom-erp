import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface TailoringRecordRow {
  id: string;
  tenant_id: string;
  tailor_id: string;
  godown_id: string;
  product_id: string;
  color: string;
  batch_id: string | null;
  stitch_count: number;
  knot_count: number;
  stitch_wage: string;
  knot_wage: string;
  total_wage: string;
  mismatch_detected: boolean;
  work_date: string;
  notes: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: TailoringRecordRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tailorId: row.tailor_id,
    godownId: row.godown_id,
    productId: row.product_id,
    color: row.color,
    batchId: row.batch_id,
    stitchCount: row.stitch_count,
    knotCount: row.knot_count,
    stitchWage: parseFloat(row.stitch_wage),
    knotWage: parseFloat(row.knot_wage),
    totalWage: parseFloat(row.total_wage),
    mismatchDetected: row.mismatch_detected,
    workDate: row.work_date,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TailoringRecordService {
  async create(
    tenantId: string,
    createdBy: string,
    data: {
      tailorId: string;
      godownId: string;
      productId: string;
      color: string;
      batchId?: string;
      stitchCount: number;
      knotCount?: number;
      workDate?: string;
      notes?: string;
    },
  ) {
    // Fetch product rates
    const product = await sql<
      { stitch_rate_per_piece: string; knot_rate_per_piece: string }[]
    >`
      SELECT stitch_rate_per_piece, knot_rate_per_piece
      FROM products WHERE id = ${data.productId} AND tenant_id = ${tenantId}
    `;
    if (product.length === 0) {
      throw AppError.notFound("Product not found");
    }

    const stitchRate = parseFloat(product[0].stitch_rate_per_piece);
    const knotRate = parseFloat(product[0].knot_rate_per_piece);
    const knotCount = data.knotCount ?? 0;

    const stitchWage = data.stitchCount * stitchRate;
    const knotWage = knotCount * knotRate;
    const totalWage = stitchWage + knotWage;

    // Mismatch detection: check woven inventory
    const wovenStock = await sql<{ quantity_pieces: number }[]>`
      SELECT COALESCE(SUM(quantity_pieces), 0) as quantity_pieces FROM inventory
      WHERE tenant_id = ${tenantId}
        AND godown_id = ${data.godownId}
        AND product_id = ${data.productId}
        AND color = ${data.color}
        AND stage = 'woven'
        ${data.batchId ? sql`AND batch_id = ${data.batchId}` : sql``}
    `;
    const availableWoven = wovenStock[0]?.quantity_pieces ?? 0;
    const mismatchDetected = data.stitchCount > availableWoven;

    const result = await sql<TailoringRecordRow[]>`
      INSERT INTO tailoring_records (
        tenant_id, tailor_id, godown_id, product_id, color, batch_id,
        stitch_count, knot_count, stitch_wage, knot_wage, total_wage,
        mismatch_detected, work_date, notes, created_by
      ) VALUES (
        ${tenantId}, ${data.tailorId}, ${data.godownId}, ${data.productId},
        ${data.color}, ${data.batchId ?? null},
        ${data.stitchCount}, ${knotCount}, ${stitchWage}, ${knotWage}, ${totalWage},
        ${mismatchDetected}, ${data.workDate ?? sql`CURRENT_DATE`}, ${data.notes ?? null}, ${createdBy}
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
      tailorId?: string;
      productId?: string;
      from?: string;
      to?: string;
    } = {},
    userRole?: string,
    userId?: string,
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const effectiveTailorId = userRole === "tailor" ? userId : query.tailorId;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM tailoring_records
      WHERE tenant_id = ${tenantId}
      ${effectiveTailorId ? sql`AND tailor_id = ${effectiveTailorId}` : sql``}
      ${query.productId ? sql`AND product_id = ${query.productId}` : sql``}
      ${query.from ? sql`AND work_date >= ${query.from}` : sql``}
      ${query.to ? sql`AND work_date <= ${query.to}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<TailoringRecordRow[]>`
      SELECT * FROM tailoring_records
      WHERE tenant_id = ${tenantId}
      ${effectiveTailorId ? sql`AND tailor_id = ${effectiveTailorId}` : sql``}
      ${query.productId ? sql`AND product_id = ${query.productId}` : sql``}
      ${query.from ? sql`AND work_date >= ${query.from}` : sql``}
      ${query.to ? sql`AND work_date <= ${query.to}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async findById(
    tenantId: string,
    id: string,
    userRole?: string,
    userId?: string,
  ) {
    const result = await sql<TailoringRecordRow[]>`
      SELECT * FROM tailoring_records WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (result.length === 0) {
      throw AppError.notFound("Tailoring record not found");
    }

    if (userRole === "tailor" && result[0].tailor_id !== userId) {
      throw AppError.forbidden("Access denied");
    }

    return toResponse(result[0]);
  }
}
