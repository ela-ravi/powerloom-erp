import { sql } from "../config/database.js";
import { NotificationService } from "../modules/notifications/notification.service.js";

const notificationService = new NotificationService();

export async function runCreditDueApproaching(): Promise<{
  tenantsProcessed: number;
  notificationsSent: number;
}> {
  const tenants = await sql<{ id: string }[]>`
    SELECT id FROM tenants WHERE status = 'active'
  `;

  let totalSent = 0;

  for (const tenant of tenants) {
    try {
      // Find invoices due within 3 days
      const invoices = await sql<
        {
          id: string;
          invoice_number: string;
          customer_id: string;
          due_date: string;
          balance_due: string;
        }[]
      >`
        SELECT id, invoice_number, customer_id, due_date, balance_due
        FROM invoices
        WHERE tenant_id = ${tenant.id}
          AND status IN ('issued', 'partially_paid')
          AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
          AND balance_due > 0
      `;

      // Get owner for notifications
      const owners = await sql<{ id: string }[]>`
        SELECT id FROM users WHERE tenant_id = ${tenant.id} AND role = 'owner' AND is_active = true
      `;

      for (const invoice of invoices) {
        for (const owner of owners) {
          await notificationService.emit(tenant.id, {
            userId: owner.id,
            eventType: "credit_due_approaching",
            title: "Credit Due Approaching",
            message: `Invoice ${invoice.invoice_number} is due on ${invoice.due_date}`,
            priority: "medium",
            referenceType: "invoice",
            referenceId: invoice.id,
          });
          totalSent++;
        }
      }
    } catch {
      // Error in one tenant shouldn't affect others
    }
  }

  return { tenantsProcessed: tenants.length, notificationsSent: totalSent };
}
