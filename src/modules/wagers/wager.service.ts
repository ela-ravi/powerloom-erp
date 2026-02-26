import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface WagerProfileRow {
  id: string;
  tenant_id: string;
  user_id: string;
  wager_type: number;
  advance_balance: string;
  original_advance: string;
  additional_advances: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: WagerProfileRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    wagerType: row.wager_type,
    advanceBalance: parseFloat(row.advance_balance),
    originalAdvance: parseFloat(row.original_advance),
    additionalAdvances: parseFloat(row.additional_advances),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class WagerService {
  async create(
    tenantId: string,
    data: {
      userId: string;
      wagerType: number;
      advanceBalance?: number;
      originalAdvance?: number;
    },
  ) {
    // Verify user exists and is a wager
    const user = await sql<{ id: string; role: string }[]>`
      SELECT id, role FROM users WHERE id = ${data.userId} AND tenant_id = ${tenantId}
    `;
    if (user.length === 0) {
      throw AppError.validation("User not found");
    }
    if (user[0].role !== "wager") {
      throw AppError.validation("User must have wager role");
    }

    // Check if profile already exists
    const existing = await sql<WagerProfileRow[]>`
      SELECT id FROM wager_profiles WHERE user_id = ${data.userId}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Wager profile already exists for this user");
    }

    const advBal = data.advanceBalance ?? 0;
    const origAdv = data.originalAdvance ?? 0;

    const result = await sql<WagerProfileRow[]>`
      INSERT INTO wager_profiles (tenant_id, user_id, wager_type, advance_balance, original_advance)
      VALUES (${tenantId}, ${data.userId}, ${data.wagerType}, ${advBal}, ${origAdv})
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      wagerType?: number;
      isActive?: boolean;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM wager_profiles
      WHERE tenant_id = ${tenantId}
      ${query.wagerType ? sql`AND wager_type = ${query.wagerType}` : sql``}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<(WagerProfileRow & { user_name?: string })[]>`
      SELECT wp.*, u.name AS user_name
      FROM wager_profiles wp
      LEFT JOIN users u ON u.id = wp.user_id
      WHERE wp.tenant_id = ${tenantId}
      ${query.wagerType ? sql`AND wp.wager_type = ${query.wagerType}` : sql``}
      ${query.isActive !== undefined ? sql`AND wp.is_active = ${query.isActive}` : sql``}
      ORDER BY wp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map((row) => ({ ...toResponse(row), name: row.user_name ?? null })),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async findById(tenantId: string, id: string) {
    const result = await sql<WagerProfileRow[]>`
      SELECT * FROM wager_profiles WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (result.length === 0) {
      throw AppError.notFound("Wager profile not found");
    }
    return toResponse(result[0]);
  }

  async findByUserId(tenantId: string, userId: string) {
    const result = await sql<WagerProfileRow[]>`
      SELECT * FROM wager_profiles WHERE user_id = ${userId} AND tenant_id = ${tenantId}
    `;
    if (result.length === 0) {
      throw AppError.notFound("Wager profile not found");
    }
    return toResponse(result[0]);
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<{ wagerType: number; isActive: boolean }>,
  ) {
    const existing = await sql<WagerProfileRow[]>`
      SELECT * FROM wager_profiles WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Wager profile not found");
    }

    const result = await sql<WagerProfileRow[]>`
      UPDATE wager_profiles SET
        wager_type = COALESCE(${data.wagerType ?? null}, wager_type),
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async getPerformance(
    tenantId: string,
    wagerId: string,
    dateRange: { from: string; to: string },
  ) {
    // Get wager profile
    const profile = await sql<WagerProfileRow[]>`
      SELECT * FROM wager_profiles WHERE id = ${wagerId} AND tenant_id = ${tenantId}
    `;
    if (profile.length === 0) {
      throw AppError.notFound("Wager profile not found");
    }

    // Get loom assigned to wager
    const loom = await sql<{ id: string; loom_type_id: string }[]>`
      SELECT id, loom_type_id FROM looms
      WHERE tenant_id = ${tenantId} AND assigned_wager_id = ${profile[0].user_id}
      LIMIT 1
    `;

    // Get loom capacity
    let capacityPerDay = 0;
    if (loom.length > 0) {
      const loomType = await sql<{ capacity_pieces_per_day: number }[]>`
        SELECT capacity_pieces_per_day FROM loom_types
        WHERE id = ${loom[0].loom_type_id} AND tenant_id = ${tenantId}
      `;
      if (loomType.length > 0) {
        capacityPerDay = loomType[0].capacity_pieces_per_day;
      }
    }

    // Calculate working days in range
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const workingDays =
      Math.ceil(
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    // Get downtime days
    const downtimeResult = await sql<{ total_minutes: string }[]>`
      SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes
      FROM loom_downtimes
      WHERE tenant_id = ${tenantId}
        AND wager_id = ${profile[0].user_id}
        AND start_time >= ${dateRange.from}
        AND start_time <= ${dateRange.to}
    `;
    const downtimeMinutes = parseInt(downtimeResult[0].total_minutes, 10);
    const downtimeDays = Math.round((downtimeMinutes / (8 * 60)) * 100) / 100; // Assume 8hr workday

    // Get actual production (piece count sum)
    const productionResult = await sql<{ total: string }[]>`
      SELECT COALESCE(SUM(piece_count), 0) as total
      FROM production_returns
      WHERE tenant_id = ${tenantId}
        AND wager_id = ${profile[0].user_id}
        AND return_date >= ${dateRange.from}
        AND return_date <= ${dateRange.to}
    `;
    const actual = parseInt(productionResult[0].total, 10);

    const expectedCapacity = Math.round(
      capacityPerDay * (workingDays - downtimeDays),
    );
    const utilization =
      expectedCapacity > 0
        ? Math.round((actual / expectedCapacity) * 10000) / 100
        : 0;

    return {
      wagerId,
      actual,
      expectedCapacity,
      utilization,
      workingDays,
      downtimeDays,
      capacityPerDay,
    };
  }

  async getRanking(
    tenantId: string,
    dateRange?: { from?: string; to?: string },
  ) {
    // Check feature flag
    const settings = await sql<{ show_wager_ranking: boolean }[]>`
      SELECT show_wager_ranking FROM tenant_settings WHERE tenant_id = ${tenantId}
    `;
    if (settings.length === 0 || !settings[0].show_wager_ranking) {
      throw AppError.forbidden("Wager ranking is disabled for this tenant");
    }

    // Default date range: last 30 days
    const to = dateRange?.to ?? new Date().toISOString().split("T")[0];
    const from =
      dateRange?.from ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    // Get all active wagers
    const wagers = await sql<WagerProfileRow[]>`
      SELECT * FROM wager_profiles WHERE tenant_id = ${tenantId} AND is_active = true
    `;

    const rankings = [];
    for (const wager of wagers) {
      const perf = await this.getPerformance(tenantId, wager.id, {
        from,
        to,
      });
      rankings.push({
        wagerId: wager.id,
        userId: wager.user_id,
        wagerType: wager.wager_type,
        actual: perf.actual,
        expectedCapacity: perf.expectedCapacity,
        utilization: perf.utilization,
      });
    }

    // Sort by utilization descending
    rankings.sort((a, b) => b.utilization - a.utilization);

    return {
      data: rankings.map((r, i) => ({ ...r, rank: i + 1 })),
      dateRange: { from, to },
    };
  }
}
