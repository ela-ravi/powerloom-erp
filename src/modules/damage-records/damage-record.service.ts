import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import { notifyAsync } from "../../shared/notify.js";

interface DamageRecordRow {
  id: string;
  tenant_id: string;
  production_return_id: string | null;
  wager_id: string | null;
  product_id: string;
  detection_point: string;
  grade: string;
  damage_count: number;
  deduction_rate_pct: string;
  production_cost_per_piece: string;
  total_deduction: string;
  approval_status: string;
  approved_by: string | null;
  approved_at: Date | null;
  is_miscellaneous: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: DamageRecordRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productionReturnId: row.production_return_id,
    wagerId: row.wager_id,
    productId: row.product_id,
    detectionPoint: row.detection_point,
    grade: row.grade,
    damageCount: row.damage_count,
    deductionRatePct: parseFloat(row.deduction_rate_pct),
    productionCostPerPiece: parseFloat(row.production_cost_per_piece),
    totalDeduction: parseFloat(row.total_deduction),
    approvalStatus: row.approval_status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    isMiscellaneous: row.is_miscellaneous,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getDeductionRate(
  settings: {
    damage_minor_deduction_pct: string;
    damage_major_deduction_pct: string;
    damage_reject_deduction_pct: string;
  },
  grade: string,
): number {
  switch (grade) {
    case "minor":
      return parseFloat(settings.damage_minor_deduction_pct);
    case "major":
      return parseFloat(settings.damage_major_deduction_pct);
    case "reject":
      return parseFloat(settings.damage_reject_deduction_pct);
    default:
      throw AppError.validation(`Invalid damage grade: ${grade}`);
  }
}

export class DamageRecordService {
  async create(
    tenantId: string,
    data: {
      productionReturnId?: string;
      wagerId?: string;
      productId: string;
      detectionPoint: string;
      grade: string;
      damageCount: number;
      productionCostPerPiece: number;
      isMiscellaneous?: boolean;
      notes?: string;
    },
  ) {
    // Get tenant settings for deduction rate snapshot
    const settings = await sql<
      {
        damage_minor_deduction_pct: string;
        damage_major_deduction_pct: string;
        damage_reject_deduction_pct: string;
      }[]
    >`
      SELECT damage_minor_deduction_pct, damage_major_deduction_pct, damage_reject_deduction_pct
      FROM tenant_settings WHERE tenant_id = ${tenantId}
    `;
    if (settings.length === 0) {
      throw AppError.notFound("Tenant settings not found");
    }

    const deductionRatePct = getDeductionRate(settings[0], data.grade);
    const totalDeduction =
      data.damageCount * data.productionCostPerPiece * (deductionRatePct / 100);

    const isMisc = data.isMiscellaneous ?? false;

    const result = await sql<DamageRecordRow[]>`
      INSERT INTO damage_records (
        tenant_id, production_return_id, wager_id, product_id,
        detection_point, grade, damage_count, deduction_rate_pct,
        production_cost_per_piece, total_deduction, is_miscellaneous, notes
      ) VALUES (
        ${tenantId}, ${data.productionReturnId ?? null}, ${isMisc ? null : (data.wagerId ?? null)}, ${data.productId},
        ${data.detectionPoint}, ${data.grade}, ${data.damageCount}, ${deductionRatePct},
        ${data.productionCostPerPiece}, ${totalDeduction}, ${isMisc}, ${data.notes ?? null}
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
      wagerId?: string;
      detectionPoint?: string;
      grade?: string;
      approvalStatus?: string;
    } = {},
    userRole?: string,
    userId?: string,
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    // Wager can only see own records
    const effectiveWagerId = userRole === "wager" ? userId : query.wagerId;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM damage_records
      WHERE tenant_id = ${tenantId}
      ${effectiveWagerId ? sql`AND wager_id = ${effectiveWagerId}` : sql``}
      ${query.detectionPoint ? sql`AND detection_point = ${query.detectionPoint}` : sql``}
      ${query.grade ? sql`AND grade = ${query.grade}` : sql``}
      ${query.approvalStatus ? sql`AND approval_status = ${query.approvalStatus}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<DamageRecordRow[]>`
      SELECT * FROM damage_records
      WHERE tenant_id = ${tenantId}
      ${effectiveWagerId ? sql`AND wager_id = ${effectiveWagerId}` : sql``}
      ${query.detectionPoint ? sql`AND detection_point = ${query.detectionPoint}` : sql``}
      ${query.grade ? sql`AND grade = ${query.grade}` : sql``}
      ${query.approvalStatus ? sql`AND approval_status = ${query.approvalStatus}` : sql``}
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
    const result = await sql<DamageRecordRow[]>`
      SELECT * FROM damage_records WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (result.length === 0) {
      throw AppError.notFound("Damage record not found");
    }

    // Wager can only see own records
    if (userRole === "wager" && result[0].wager_id !== userId) {
      throw AppError.forbidden("Access denied");
    }

    return toResponse(result[0]);
  }

  async approve(tenantId: string, id: string, approvedBy: string) {
    const existing = await sql<DamageRecordRow[]>`
      SELECT * FROM damage_records WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Damage record not found");
    }
    if (existing[0].approval_status !== "pending") {
      throw AppError.validation(
        `Damage record already ${existing[0].approval_status}`,
      );
    }

    const result = await sql<DamageRecordRow[]>`
      UPDATE damage_records SET
        approval_status = 'approved',
        approved_by = ${approvedBy},
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    // Notify the wager that their damage record was approved
    if (existing[0].wager_id) {
      const wager = await sql<{ user_id: string }[]>`
        SELECT user_id FROM wager_profiles WHERE id = ${existing[0].wager_id} AND tenant_id = ${tenantId}
      `;
      if (wager.length > 0) {
        notifyAsync(tenantId, {
          userId: wager[0].user_id,
          eventType: "damage_approved",
          title: "Damage Record Approved",
          message: `Damage record #${id.slice(0, 8)} has been approved. Deduction will be applied in next wage cycle.`,
          priority: "medium",
          referenceType: "damage_record",
          referenceId: id,
        });
      }
    }

    return toResponse(result[0]);
  }

  async reject(tenantId: string, id: string, rejectedBy: string) {
    const existing = await sql<DamageRecordRow[]>`
      SELECT * FROM damage_records WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Damage record not found");
    }
    if (existing[0].approval_status !== "pending") {
      throw AppError.validation(
        `Damage record already ${existing[0].approval_status}`,
      );
    }

    const result = await sql<DamageRecordRow[]>`
      UPDATE damage_records SET
        approval_status = 'rejected',
        approved_by = ${rejectedBy},
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    // Notify the wager that their damage record was rejected
    if (existing[0].wager_id) {
      const wager = await sql<{ user_id: string }[]>`
        SELECT user_id FROM wager_profiles WHERE id = ${existing[0].wager_id} AND tenant_id = ${tenantId}
      `;
      if (wager.length > 0) {
        notifyAsync(tenantId, {
          userId: wager[0].user_id,
          eventType: "damage_rejected",
          title: "Damage Record Rejected",
          message: `Damage record #${id.slice(0, 8)} has been rejected. No deduction will be applied.`,
          priority: "low",
          referenceType: "damage_record",
          referenceId: id,
        });
      }
    }

    return toResponse(result[0]);
  }
}
