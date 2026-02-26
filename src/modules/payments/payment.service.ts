import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import { notifyOwners } from "../../shared/notify.js";

interface PaymentRow {
  id: string;
  tenant_id: string;
  invoice_id: string;
  customer_id: string;
  amount: string;
  payment_method: string;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  created_by: string;
  created_at: Date;
}

function toResponse(row: PaymentRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    invoiceId: row.invoice_id,
    customerId: row.customer_id,
    amount: parseFloat(row.amount),
    paymentMethod: row.payment_method,
    paymentDate: row.payment_date,
    referenceNumber: row.reference_number,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// postgres.js TransactionSql loses call signatures due to Omit<> in TS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxSql = any;

export class PaymentService {
  async create(
    tenantId: string,
    createdBy: string,
    data: {
      invoiceId: string;
      amount: number;
      paymentMethod: string;
      paymentDate?: string;
      referenceNumber?: string;
      notes?: string;
    },
  ) {
    const paymentDate =
      data.paymentDate || new Date().toISOString().split("T")[0];

    // All validation and writes inside a single transaction with row locking
    return await sql.begin(async (tx: TxSql) => {
      // Lock the invoice row to prevent concurrent payment race conditions
      const invoice = await tx<
        {
          id: string;
          customer_id: string;
          balance_due: string;
          status: string;
          total_amount: string;
        }[]
      >`
        SELECT id, customer_id, balance_due, status, total_amount
        FROM invoices WHERE id = ${data.invoiceId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `;
      if (invoice.length === 0) {
        throw AppError.notFound("Invoice not found");
      }

      const inv = invoice[0];
      if (inv.status === "draft") {
        throw AppError.validation("Cannot record payment for draft invoice");
      }
      if (inv.status === "cancelled") {
        throw AppError.validation(
          "Cannot record payment for cancelled invoice",
        );
      }
      if (inv.status === "paid") {
        throw AppError.validation("Invoice is already fully paid");
      }

      const balanceDue = parseFloat(inv.balance_due);
      if (data.amount > balanceDue) {
        throw AppError.validation("Payment amount exceeds balance due");
      }

      // Check bill-to-bill customer constraint
      const customer = await tx<{ customer_type: string }[]>`
        SELECT customer_type FROM customers
        WHERE id = ${inv.customer_id} AND tenant_id = ${tenantId}
      `;
      if (customer.length === 0) {
        throw AppError.notFound("Customer not found");
      }
      if (
        customer[0].customer_type === "wholesale_bill_to_bill" &&
        data.amount < balanceDue
      ) {
        throw AppError.validation(
          "Bill-to-bill customers must pay the full invoice amount",
        );
      }

      const result = await tx<PaymentRow[]>`
        INSERT INTO payments (
          tenant_id, invoice_id, customer_id, amount,
          payment_method, payment_date, reference_number, notes, created_by
        ) VALUES (
          ${tenantId}, ${data.invoiceId}, ${inv.customer_id}, ${data.amount},
          ${data.paymentMethod}, ${paymentDate}, ${data.referenceNumber ?? null},
          ${data.notes ?? null}, ${createdBy}
        )
        RETURNING *
      `;

      // Update invoice using relative balance_due for consistency
      const newBalanceDue = Math.round((balanceDue - data.amount) * 100) / 100;
      const newStatus = newBalanceDue <= 0 ? "paid" : "partially_paid";

      await tx`
        UPDATE invoices SET
          amount_paid = amount_paid + ${data.amount},
          balance_due = ${newBalanceDue},
          status = ${newStatus},
          updated_at = NOW()
        WHERE id = ${data.invoiceId} AND tenant_id = ${tenantId}
      `;

      // Update customer outstanding balance
      await tx`
        UPDATE customers SET
          outstanding_balance = outstanding_balance - ${data.amount},
          updated_at = NOW()
        WHERE id = ${inv.customer_id} AND tenant_id = ${tenantId}
      `;

      // Notify owners about payment received
      notifyOwners(tenantId, {
        eventType: "payment_received",
        title: "Payment Received",
        message: `Payment of ₹${data.amount} received for invoice. Status: ${newStatus}.`,
        priority: "low",
        referenceType: "payment",
        referenceId: result[0].id,
      });

      return toResponse(result[0]);
    });
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      invoiceId?: string;
      customerId?: string;
      fromDate?: string;
      toDate?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM payments
      WHERE tenant_id = ${tenantId}
      ${query.invoiceId ? sql`AND invoice_id = ${query.invoiceId}` : sql``}
      ${query.customerId ? sql`AND customer_id = ${query.customerId}` : sql``}
      ${query.fromDate ? sql`AND payment_date >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND payment_date <= ${query.toDate}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<PaymentRow[]>`
      SELECT * FROM payments
      WHERE tenant_id = ${tenantId}
      ${query.invoiceId ? sql`AND invoice_id = ${query.invoiceId}` : sql``}
      ${query.customerId ? sql`AND customer_id = ${query.customerId}` : sql``}
      ${query.fromDate ? sql`AND payment_date >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND payment_date <= ${query.toDate}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }
}
