import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface FraudAlertRow {
  id: string;
  tenant_id: string;
  alert_type: string;
  severity: string;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  wager_id: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: Date | null;
  created_at: Date;
}

function toResponse(row: FraudAlertRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    alertType: row.alert_type,
    severity: row.severity,
    description: row.description,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    wagerId: row.wager_id,
    isResolved: row.is_resolved,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export class FraudAlertService {
  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      alertType?: string;
      severity?: string;
      isResolved?: boolean;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM fraud_alerts
      WHERE tenant_id = ${tenantId}
      ${query.alertType ? sql`AND alert_type = ${query.alertType}` : sql``}
      ${query.severity ? sql`AND severity = ${query.severity}` : sql``}
      ${query.isResolved !== undefined ? sql`AND is_resolved = ${query.isResolved}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<FraudAlertRow[]>`
      SELECT * FROM fraud_alerts
      WHERE tenant_id = ${tenantId}
      ${query.alertType ? sql`AND alert_type = ${query.alertType}` : sql``}
      ${query.severity ? sql`AND severity = ${query.severity}` : sql``}
      ${query.isResolved !== undefined ? sql`AND is_resolved = ${query.isResolved}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async resolve(tenantId: string, alertId: string, resolvedBy: string) {
    const existing = await sql<FraudAlertRow[]>`
      SELECT * FROM fraud_alerts
      WHERE id = ${alertId} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Fraud alert not found");
    }
    if (existing[0].is_resolved) {
      throw AppError.validation("Fraud alert is already resolved");
    }

    const result = await sql<FraudAlertRow[]>`
      UPDATE fraud_alerts SET
        is_resolved = true,
        resolved_by = ${resolvedBy},
        resolved_at = NOW()
      WHERE id = ${alertId} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    return toResponse(result[0]);
  }

  async create(
    tenantId: string,
    data: {
      alertType: string;
      severity?: string;
      description: string;
      referenceType?: string;
      referenceId?: string;
      wagerId?: string;
    },
  ) {
    const result = await sql<FraudAlertRow[]>`
      INSERT INTO fraud_alerts (
        tenant_id, alert_type, severity, description,
        reference_type, reference_id, wager_id
      ) VALUES (
        ${tenantId}, ${data.alertType}, ${data.severity ?? "medium"}, ${data.description},
        ${data.referenceType ?? null}, ${data.referenceId ?? null}, ${data.wagerId ?? null}
      )
      RETURNING *
    `;
    return toResponse(result[0]);
  }
}
