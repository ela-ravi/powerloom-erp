import { sql } from "../config/database.js";
import { notifyOwners } from "../shared/notify.js";

export async function runOverdueDetection(): Promise<{
  tenantsProcessed: number;
  invoicesUpdated: number;
}> {
  const tenants = await sql<{ id: string }[]>`
    SELECT id FROM tenants WHERE status = 'active'
  `;

  let totalUpdated = 0;

  for (const tenant of tenants) {
    try {
      const updated = await sql<{ id: string; invoice_number: string }[]>`
        UPDATE invoices SET status = 'overdue', updated_at = NOW()
        WHERE tenant_id = ${tenant.id}
          AND status IN ('issued', 'partially_paid')
          AND due_date < CURRENT_DATE
          AND balance_due > 0
        RETURNING id, invoice_number
      `;
      totalUpdated += updated.length;

      // Notify owners about overdue invoices
      if (updated.length > 0) {
        notifyOwners(tenant.id, {
          eventType: "invoice_overdue",
          title: "Invoices Overdue",
          message: `${updated.length} invoice(s) are now overdue.`,
          priority: "high",
          referenceType: "invoice",
          referenceId: updated[0].id,
        });
      }
    } catch {
      // Error in one tenant shouldn't affect others
    }
  }

  return { tenantsProcessed: tenants.length, invoicesUpdated: totalUpdated };
}
