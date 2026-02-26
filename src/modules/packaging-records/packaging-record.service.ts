import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface PackagingRecordRow {
  id: string;
  tenant_id: string;
  packager_id: string;
  godown_id: string;
  product_id: string;
  color: string;
  batch_id: string | null;
  bundle_type: string;
  bundle_count: number;
  pieces_per_bundle: number;
  total_pieces: number;
  bundle_rate: string;
  total_wage: string;
  work_date: string;
  notes: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: PackagingRecordRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    packagerId: row.packager_id,
    godownId: row.godown_id,
    productId: row.product_id,
    color: row.color,
    batchId: row.batch_id,
    bundleType: row.bundle_type,
    bundleCount: row.bundle_count,
    piecesPerBundle: row.pieces_per_bundle,
    totalPieces: row.total_pieces,
    bundleRate: parseFloat(row.bundle_rate),
    totalWage: parseFloat(row.total_wage),
    workDate: row.work_date,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PackagingRecordService {
  async create(
    tenantId: string,
    createdBy: string,
    data: {
      packagerId: string;
      godownId: string;
      productId: string;
      color: string;
      batchId?: string;
      bundleType: string;
      bundleCount: number;
      workDate?: string;
      notes?: string;
    },
  ) {
    // Fetch product config for bundle size and rate
    const product = await sql<
      {
        small_bundle_count: number;
        large_bundle_count: number;
        bundle_rate_small: string;
        bundle_rate_large: string;
      }[]
    >`
      SELECT small_bundle_count, large_bundle_count, bundle_rate_small, bundle_rate_large
      FROM products WHERE id = ${data.productId} AND tenant_id = ${tenantId}
    `;
    if (product.length === 0) {
      throw AppError.notFound("Product not found");
    }

    const piecesPerBundle =
      data.bundleType === "small"
        ? product[0].small_bundle_count
        : product[0].large_bundle_count;
    const bundleRate =
      data.bundleType === "small"
        ? parseFloat(product[0].bundle_rate_small)
        : parseFloat(product[0].bundle_rate_large);

    const totalPieces = data.bundleCount * piecesPerBundle;
    const totalWage = data.bundleCount * bundleRate;

    const result = await sql<PackagingRecordRow[]>`
      INSERT INTO packaging_records (
        tenant_id, packager_id, godown_id, product_id, color, batch_id,
        bundle_type, bundle_count, pieces_per_bundle, total_pieces,
        bundle_rate, total_wage, work_date, notes, created_by
      ) VALUES (
        ${tenantId}, ${data.packagerId}, ${data.godownId}, ${data.productId},
        ${data.color}, ${data.batchId ?? null},
        ${data.bundleType}, ${data.bundleCount}, ${piecesPerBundle}, ${totalPieces},
        ${bundleRate}, ${totalWage}, ${data.workDate ?? sql`CURRENT_DATE`}, ${data.notes ?? null}, ${createdBy}
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
      packagerId?: string;
      productId?: string;
      bundleType?: string;
      from?: string;
      to?: string;
    } = {},
    userRole?: string,
    userId?: string,
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const effectivePackagerId =
      userRole === "packager" ? userId : query.packagerId;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM packaging_records
      WHERE tenant_id = ${tenantId}
      ${effectivePackagerId ? sql`AND packager_id = ${effectivePackagerId}` : sql``}
      ${query.productId ? sql`AND product_id = ${query.productId}` : sql``}
      ${query.bundleType ? sql`AND bundle_type = ${query.bundleType}` : sql``}
      ${query.from ? sql`AND work_date >= ${query.from}` : sql``}
      ${query.to ? sql`AND work_date <= ${query.to}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<PackagingRecordRow[]>`
      SELECT * FROM packaging_records
      WHERE tenant_id = ${tenantId}
      ${effectivePackagerId ? sql`AND packager_id = ${effectivePackagerId}` : sql``}
      ${query.productId ? sql`AND product_id = ${query.productId}` : sql``}
      ${query.bundleType ? sql`AND bundle_type = ${query.bundleType}` : sql``}
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
    const result = await sql<PackagingRecordRow[]>`
      SELECT * FROM packaging_records WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (result.length === 0) {
      throw AppError.notFound("Packaging record not found");
    }

    if (userRole === "packager" && result[0].packager_id !== userId) {
      throw AppError.forbidden("Access denied");
    }

    return toResponse(result[0]);
  }
}
