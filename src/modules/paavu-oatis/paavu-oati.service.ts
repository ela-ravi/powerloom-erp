import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface PaavuOatiProfileRow {
  id: string;
  tenant_id: string;
  user_id: string;
  advance_balance: string;
  original_advance: string;
  additional_advances: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: PaavuOatiProfileRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    advanceBalance: parseFloat(row.advance_balance),
    originalAdvance: parseFloat(row.original_advance),
    additionalAdvances: parseFloat(row.additional_advances),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PaavuOatiService {
  async create(
    tenantId: string,
    data: {
      userId: string;
      advanceBalance?: number;
      originalAdvance?: number;
    },
  ) {
    // Verify user exists and is a paavu_oati
    const user = await sql<{ id: string; role: string }[]>`
      SELECT id, role FROM users WHERE id = ${data.userId} AND tenant_id = ${tenantId}
    `;
    if (user.length === 0) {
      throw AppError.validation("User not found");
    }
    if (user[0].role !== "paavu_oati") {
      throw AppError.validation("User must have paavu_oati role");
    }

    // Check if profile already exists
    const existing = await sql<PaavuOatiProfileRow[]>`
      SELECT id FROM paavu_oati_profiles WHERE user_id = ${data.userId}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Paavu Oati profile already exists for this user");
    }

    const advBal = data.advanceBalance ?? 0;
    const origAdv = data.originalAdvance ?? 0;

    const result = await sql<PaavuOatiProfileRow[]>`
      INSERT INTO paavu_oati_profiles (tenant_id, user_id, advance_balance, original_advance)
      VALUES (${tenantId}, ${data.userId}, ${advBal}, ${origAdv})
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      isActive?: boolean;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM paavu_oati_profiles
      WHERE tenant_id = ${tenantId}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<(PaavuOatiProfileRow & { user_name?: string })[]>`
      SELECT po.*, u.name AS user_name
      FROM paavu_oati_profiles po
      LEFT JOIN users u ON u.id = po.user_id
      WHERE po.tenant_id = ${tenantId}
      ${query.isActive !== undefined ? sql`AND po.is_active = ${query.isActive}` : sql``}
      ORDER BY po.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map((row) => ({ ...toResponse(row), name: row.user_name ?? null })),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async findById(tenantId: string, id: string) {
    const result = await sql<PaavuOatiProfileRow[]>`
      SELECT * FROM paavu_oati_profiles WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (result.length === 0) {
      throw AppError.notFound("Paavu Oati profile not found");
    }
    return toResponse(result[0]);
  }

  async findByUserId(tenantId: string, userId: string) {
    const result = await sql<PaavuOatiProfileRow[]>`
      SELECT * FROM paavu_oati_profiles WHERE user_id = ${userId} AND tenant_id = ${tenantId}
    `;
    if (result.length === 0) {
      throw AppError.notFound("Paavu Oati profile not found");
    }
    return toResponse(result[0]);
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<{ isActive: boolean }>,
  ) {
    const existing = await sql<PaavuOatiProfileRow[]>`
      SELECT * FROM paavu_oati_profiles WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Paavu Oati profile not found");
    }

    const result = await sql<PaavuOatiProfileRow[]>`
      UPDATE paavu_oati_profiles SET
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async delete(tenantId: string, id: string) {
    const existing = await sql<PaavuOatiProfileRow[]>`
      SELECT * FROM paavu_oati_profiles WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Paavu Oati profile not found");
    }

    const userId = existing[0].user_id;

    // Check paavu_issuances for references to this profile's user
    const issuanceInUse = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM paavu_issuances
      WHERE tenant_id = ${tenantId} AND wager_id = ${userId}
    `;
    if (parseInt(issuanceInUse[0].count, 10) > 0) {
      throw AppError.conflict(
        "Cannot delete this Paavu Oati — it has paavu issuance records",
      );
    }

    // Check wage_records for worker references
    const wageInUse = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM wage_records
      WHERE tenant_id = ${tenantId} AND worker_id = ${userId}
    `;
    if (parseInt(wageInUse[0].count, 10) > 0) {
      throw AppError.conflict(
        "Cannot delete this Paavu Oati — it has wage records",
      );
    }

    await sql`
      DELETE FROM paavu_oati_profiles WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
  }
}
