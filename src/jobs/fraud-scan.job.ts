import { sql } from "../config/database.js";
import { FraudAlertService } from "../modules/fraud-alerts/fraud-alert.service.js";
import { notifyOwners } from "../shared/notify.js";

const fraudAlertService = new FraudAlertService();

export async function runFraudDetectionScan(): Promise<{
  tenantsProcessed: number;
  alertsCreated: number;
}> {
  const tenants = await sql<{ id: string }[]>`
    SELECT id FROM tenants WHERE status = 'active'
  `;

  let totalAlerts = 0;

  for (const tenant of tenants) {
    try {
      totalAlerts += await checkCustomerOverdue(tenant.id);
    } catch {
      // Error in one tenant shouldn't affect others
    }
  }

  return { tenantsProcessed: tenants.length, alertsCreated: totalAlerts };
}

async function checkCustomerOverdue(tenantId: string): Promise<number> {
  // Find customers with 2+ overdue invoices
  const customers = await sql<{ customer_id: string; overdue_count: string }[]>`
    SELECT customer_id, COUNT(*) as overdue_count
    FROM invoices
    WHERE tenant_id = ${tenantId} AND status = 'overdue'
    GROUP BY customer_id
    HAVING COUNT(*) >= 2
  `;

  let created = 0;
  for (const customer of customers) {
    // Check if alert already exists for this customer recently
    const existing = await sql<{ id: string }[]>`
      SELECT id FROM fraud_alerts
      WHERE tenant_id = ${tenantId}
        AND alert_type = 'customer_overdue'
        AND reference_id = ${customer.customer_id}
        AND created_at > NOW() - INTERVAL '7 days'
    `;

    if (existing.length === 0) {
      const alert = await fraudAlertService.create(tenantId, {
        alertType: "customer_overdue",
        severity: "medium",
        description: `Customer has ${customer.overdue_count} overdue invoices`,
        referenceType: "customer",
        referenceId: customer.customer_id,
      });

      // Notify owners about new fraud alert
      notifyOwners(tenantId, {
        eventType: "fraud_alert_created",
        title: "Fraud Alert",
        message: `Customer has ${customer.overdue_count} overdue invoices. Review recommended.`,
        priority: "urgent",
        referenceType: "fraud_alert",
        referenceId: alert.id,
      });
      created++;
    }
  }

  return created;
}
