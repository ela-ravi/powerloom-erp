import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import { notifyOwners } from "../../shared/notify.js";

interface InvoiceRow {
  id: string;
  tenant_id: string;
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  tax_type: string;
  subtotal: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  status: string;
  eway_bill_number: string | null;
  batch_id: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface InvoiceItemRow {
  id: string;
  tenant_id: string;
  invoice_id: string;
  product_id: string;
  color: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  gst_rate_pct: string;
  hsn_code: string | null;
  batch_id: string | null;
  created_at: Date;
}

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

function toInvoiceResponse(row: InvoiceRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    taxType: row.tax_type,
    subtotal: parseFloat(row.subtotal),
    cgstAmount: parseFloat(row.cgst_amount),
    sgstAmount: parseFloat(row.sgst_amount),
    igstAmount: parseFloat(row.igst_amount),
    totalAmount: parseFloat(row.total_amount),
    amountPaid: parseFloat(row.amount_paid),
    balanceDue: parseFloat(row.balance_due),
    status: row.status,
    ewayBillNumber: row.eway_bill_number,
    batchId: row.batch_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toItemResponse(row: InvoiceItemRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    invoiceId: row.invoice_id,
    productId: row.product_id,
    color: row.color,
    quantity: row.quantity,
    unitPrice: parseFloat(row.unit_price),
    lineTotal: parseFloat(row.line_total),
    gstRatePct: parseFloat(row.gst_rate_pct),
    hsnCode: row.hsn_code,
    batchId: row.batch_id,
    createdAt: row.created_at,
  };
}

// postgres.js TransactionSql loses call signatures due to Omit<> in TS.
// We use `any` for the tx param in sql.begin() callbacks to work around this.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxSql = any;

export class InvoiceService {
  async create(
    tenantId: string,
    createdBy: string,
    data: {
      customerId: string;
      invoiceDate?: string;
      ewayBillNumber?: string;
      batchId?: string;
      items: Array<{
        productId: string;
        color: string;
        quantity: number;
        unitPrice: number;
        batchId?: string;
      }>;
    },
  ) {
    // Get tenant state_code
    const tenant = await sql<{ state_code: string }[]>`
      SELECT state_code FROM tenants WHERE id = ${tenantId}
    `;
    if (tenant.length === 0) {
      throw AppError.notFound("Tenant not found");
    }

    // Get customer details
    const customer = await sql<
      {
        id: string;
        state_code: string;
        credit_period_days: number;
        customer_type: string;
      }[]
    >`
      SELECT id, state_code, credit_period_days, customer_type
      FROM customers WHERE id = ${data.customerId} AND tenant_id = ${tenantId}
    `;
    if (customer.length === 0) {
      throw AppError.notFound("Customer not found");
    }

    // Determine tax type
    const isIntraState = tenant[0].state_code === customer[0].state_code;
    const taxType = isIntraState ? "intra_state" : "inter_state";

    // Calculate dates
    const invoiceDate =
      data.invoiceDate || new Date().toISOString().split("T")[0];
    const creditDays = customer[0].credit_period_days;
    const dueDateObj = new Date(invoiceDate);
    dueDateObj.setDate(dueDateObj.getDate() + creditDays);
    const dueDate = dueDateObj.toISOString().split("T")[0];

    // Get product details for GST rate and HSN snapshots
    const productIds = data.items.map((item) => item.productId);
    const products = await sql<
      { id: string; gst_rate_pct: string; hsn_code: string | null }[]
    >`
      SELECT id, gst_rate_pct, hsn_code
      FROM products WHERE id = ANY(${productIds}) AND tenant_id = ${tenantId}
    `;
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate totals per item with per-line GST rounding
    let subtotal = 0;
    const itemsWithCalc = data.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw AppError.validation(`Product not found: ${item.productId}`);
      }
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      return {
        ...item,
        lineTotal,
        gstRatePct: parseFloat(product.gst_rate_pct),
        hsnCode: product.hsn_code,
      };
    });

    // Calculate GST per item (rounded per line) and aggregate
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    for (const item of itemsWithCalc) {
      const taxableAmount = item.lineTotal;
      if (isIntraState) {
        const halfRate = item.gstRatePct / 2 / 100;
        totalCgst += Math.round(taxableAmount * halfRate * 100) / 100;
        totalSgst += Math.round(taxableAmount * halfRate * 100) / 100;
      } else {
        totalIgst +=
          Math.round(taxableAmount * (item.gstRatePct / 100) * 100) / 100;
      }
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const totalAmount =
      Math.round((subtotal + totalCgst + totalSgst + totalIgst) * 100) / 100;

    // Transaction: advisory lock + insert invoice + insert items
    return await sql.begin(async (tx: TxSql) => {
      // Advisory lock keyed on tenant to prevent duplicate invoice numbers
      await tx`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;

      const invoiceNum = await this.generateInvoiceNumber(tenantId, tx);

      const result = await tx<InvoiceRow[]>`
        INSERT INTO invoices (
          tenant_id, invoice_number, customer_id, invoice_date, due_date,
          tax_type, subtotal, cgst_amount, sgst_amount, igst_amount,
          total_amount, amount_paid, balance_due, status,
          eway_bill_number, batch_id, created_by
        ) VALUES (
          ${tenantId}, ${invoiceNum}, ${data.customerId}, ${invoiceDate}, ${dueDate},
          ${taxType}, ${subtotal}, ${totalCgst}, ${totalSgst}, ${totalIgst},
          ${totalAmount}, 0, ${totalAmount}, 'draft',
          ${data.ewayBillNumber ?? null}, ${data.batchId ?? null}, ${createdBy}
        )
        RETURNING *
      `;

      const invoiceId = result[0].id;
      const items: InvoiceItemRow[] = [];
      for (const item of itemsWithCalc) {
        const itemResult = await tx<InvoiceItemRow[]>`
          INSERT INTO invoice_items (
            tenant_id, invoice_id, product_id, color, quantity,
            unit_price, line_total, gst_rate_pct, hsn_code, batch_id
          ) VALUES (
            ${tenantId}, ${invoiceId}, ${item.productId}, ${item.color}, ${item.quantity},
            ${item.unitPrice}, ${item.lineTotal}, ${item.gstRatePct}, ${item.hsnCode ?? null}, ${item.batchId ?? null}
          )
          RETURNING *
        `;
        items.push(itemResult[0]);
      }

      return {
        ...toInvoiceResponse(result[0]),
        items: items.map(toItemResponse),
      };
    });
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      customerId?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM invoices
      WHERE tenant_id = ${tenantId}
      ${query.customerId ? sql`AND customer_id = ${query.customerId}` : sql``}
      ${query.status ? sql`AND status = ${query.status}` : sql``}
      ${query.fromDate ? sql`AND invoice_date >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND invoice_date <= ${query.toDate}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<InvoiceRow[]>`
      SELECT * FROM invoices
      WHERE tenant_id = ${tenantId}
      ${query.customerId ? sql`AND customer_id = ${query.customerId}` : sql``}
      ${query.status ? sql`AND status = ${query.status}` : sql``}
      ${query.fromDate ? sql`AND invoice_date >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND invoice_date <= ${query.toDate}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toInvoiceResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async findById(tenantId: string, invoiceId: string) {
    const result = await sql<InvoiceRow[]>`
      SELECT * FROM invoices
      WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
    `;
    if (result.length === 0) {
      throw AppError.notFound("Invoice not found");
    }

    const items = await sql<InvoiceItemRow[]>`
      SELECT * FROM invoice_items
      WHERE invoice_id = ${invoiceId} AND tenant_id = ${tenantId}
      ORDER BY created_at ASC
    `;

    return {
      ...toInvoiceResponse(result[0]),
      items: items.map(toItemResponse),
    };
  }

  async update(
    tenantId: string,
    invoiceId: string,
    data: {
      ewayBillNumber?: string;
      items?: Array<{
        productId: string;
        color: string;
        quantity: number;
        unitPrice: number;
        batchId?: string;
      }>;
    },
  ) {
    await sql.begin(async (tx: TxSql) => {
      // Lock invoice row inside transaction to prevent TOCTOU race
      const existing = await tx<InvoiceRow[]>`
        SELECT * FROM invoices
        WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `;
      if (existing.length === 0) {
        throw AppError.notFound("Invoice not found");
      }
      if (existing[0].status !== "draft") {
        throw AppError.validation("Only draft invoices can be updated");
      }

      if (data.ewayBillNumber !== undefined) {
        await tx`
          UPDATE invoices SET eway_bill_number = ${data.ewayBillNumber}, updated_at = NOW()
          WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
        `;
      }

      if (data.items) {
        const tenant = await tx<{ state_code: string }[]>`
          SELECT state_code FROM tenants WHERE id = ${tenantId}
        `;
        const customer = await tx<{ state_code: string }[]>`
          SELECT state_code FROM customers
          WHERE id = ${existing[0].customer_id} AND tenant_id = ${tenantId}
        `;

        const isIntraState = tenant[0].state_code === customer[0].state_code;

        const productIds = data.items.map((item) => item.productId);
        const products = await tx<
          { id: string; gst_rate_pct: string; hsn_code: string | null }[]
        >`
          SELECT id, gst_rate_pct, hsn_code
          FROM products WHERE id = ANY(${productIds}) AND tenant_id = ${tenantId}
        `;
        const productMap = new Map(
          products.map((p: { id: string }) => [p.id, p]),
        );

        let subtotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;

        const itemsWithCalc = data.items.map((item) => {
          const product = productMap.get(item.productId) as
            | { id: string; gst_rate_pct: string; hsn_code: string | null }
            | undefined;
          if (!product) {
            throw AppError.validation(`Product not found: ${item.productId}`);
          }
          const lineTotal = item.quantity * item.unitPrice;
          subtotal += lineTotal;
          const gstRate = parseFloat(product.gst_rate_pct);

          if (isIntraState) {
            const halfRate = gstRate / 2 / 100;
            totalCgst += Math.round(lineTotal * halfRate * 100) / 100;
            totalSgst += Math.round(lineTotal * halfRate * 100) / 100;
          } else {
            totalIgst += Math.round(lineTotal * (gstRate / 100) * 100) / 100;
          }

          return {
            ...item,
            lineTotal,
            gstRatePct: gstRate,
            hsnCode: product.hsn_code,
          };
        });

        subtotal = Math.round(subtotal * 100) / 100;
        const totalAmount =
          Math.round((subtotal + totalCgst + totalSgst + totalIgst) * 100) /
          100;

        await tx`
          DELETE FROM invoice_items
          WHERE invoice_id = ${invoiceId} AND tenant_id = ${tenantId}
        `;

        for (const item of itemsWithCalc) {
          await tx`
            INSERT INTO invoice_items (
              tenant_id, invoice_id, product_id, color, quantity,
              unit_price, line_total, gst_rate_pct, hsn_code, batch_id
            ) VALUES (
              ${tenantId}, ${invoiceId}, ${item.productId}, ${item.color}, ${item.quantity},
              ${item.unitPrice}, ${item.lineTotal}, ${item.gstRatePct}, ${item.hsnCode ?? null}, ${item.batchId ?? null}
            )
          `;
        }

        await tx`
          UPDATE invoices SET
            subtotal = ${subtotal}, cgst_amount = ${totalCgst}, sgst_amount = ${totalSgst},
            igst_amount = ${totalIgst}, total_amount = ${totalAmount}, balance_due = ${totalAmount},
            updated_at = NOW()
          WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
        `;
      }
    });

    return this.findById(tenantId, invoiceId);
  }

  async issue(tenantId: string, invoiceId: string) {
    await sql.begin(async (tx: TxSql) => {
      // Lock invoice inside transaction to prevent double-issue race
      const invoice = await tx<InvoiceRow[]>`
        SELECT * FROM invoices
        WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `;
      if (invoice.length === 0) {
        throw AppError.notFound("Invoice not found");
      }
      if (invoice[0].status !== "draft") {
        throw AppError.validation("Only draft invoices can be issued");
      }

      await tx`
        UPDATE customers SET
          outstanding_balance = outstanding_balance + ${invoice[0].total_amount},
          updated_at = NOW()
        WHERE id = ${invoice[0].customer_id} AND tenant_id = ${tenantId}
      `;

      await tx`
        UPDATE invoices SET status = 'issued', updated_at = NOW()
        WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
      `;
    });

    // Notify owners about invoice issuance
    notifyOwners(tenantId, {
      eventType: "invoice_issued",
      title: "Invoice Issued",
      message: `Invoice ${invoiceId.slice(0, 8)} has been issued.`,
      priority: "low",
      referenceType: "invoice",
      referenceId: invoiceId,
    });

    return this.findById(tenantId, invoiceId);
  }

  async cancel(tenantId: string, invoiceId: string) {
    await sql.begin(async (tx: TxSql) => {
      // Lock invoice inside transaction to prevent race conditions
      const invoice = await tx<InvoiceRow[]>`
        SELECT * FROM invoices
        WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `;
      if (invoice.length === 0) {
        throw AppError.notFound("Invoice not found");
      }
      if (invoice[0].status === "cancelled") {
        throw AppError.validation("Invoice is already cancelled");
      }
      if (invoice[0].status === "paid") {
        throw AppError.validation("Paid invoices cannot be cancelled");
      }

      if (
        invoice[0].status === "issued" ||
        invoice[0].status === "partially_paid" ||
        invoice[0].status === "overdue"
      ) {
        const balanceDue = parseFloat(invoice[0].balance_due);
        await tx`
          UPDATE customers SET
            outstanding_balance = outstanding_balance - ${balanceDue},
            updated_at = NOW()
          WHERE id = ${invoice[0].customer_id} AND tenant_id = ${tenantId}
        `;
      }

      await tx`
        UPDATE invoices SET status = 'cancelled', updated_at = NOW()
        WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
      `;
    });

    return this.findById(tenantId, invoiceId);
  }

  async getEwayBill(tenantId: string, invoiceId: string) {
    const invoice = await sql<InvoiceRow[]>`
      SELECT * FROM invoices
      WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
    `;
    if (invoice.length === 0) {
      throw AppError.notFound("Invoice not found");
    }

    const items = await sql<(InvoiceItemRow & { product_name: string })[]>`
      SELECT ii.*, p.name as product_name
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ${invoiceId} AND ii.tenant_id = ${tenantId}
    `;

    const tenant = await sql<
      { name: string; state_code: string; gstin: string | null }[]
    >`
      SELECT name, state_code, gstin FROM tenants WHERE id = ${tenantId}
    `;

    const customer = await sql<
      {
        name: string;
        state_code: string;
        gstin: string | null;
        address: string | null;
      }[]
    >`
      SELECT name, state_code, gstin, address
      FROM customers WHERE id = ${invoice[0].customer_id} AND tenant_id = ${tenantId}
    `;

    return {
      ewayBillNumber: invoice[0].eway_bill_number,
      invoiceNumber: invoice[0].invoice_number,
      invoiceDate: invoice[0].invoice_date,
      supplier: {
        name: tenant[0].name,
        stateCode: tenant[0].state_code,
        gstin: tenant[0].gstin,
      },
      recipient: {
        name: customer[0].name,
        stateCode: customer[0].state_code,
        gstin: customer[0].gstin,
        address: customer[0].address,
      },
      taxType: invoice[0].tax_type,
      subtotal: parseFloat(invoice[0].subtotal),
      cgstAmount: parseFloat(invoice[0].cgst_amount),
      sgstAmount: parseFloat(invoice[0].sgst_amount),
      igstAmount: parseFloat(invoice[0].igst_amount),
      totalAmount: parseFloat(invoice[0].total_amount),
      items: items.map((item) => ({
        productId: item.product_id,
        productName: item.product_name,
        hsnCode: item.hsn_code,
        color: item.color,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price),
        lineTotal: parseFloat(item.line_total),
        gstRatePct: parseFloat(item.gst_rate_pct),
      })),
    };
  }

  async getCustomerStatement(
    tenantId: string,
    customerId: string,
    query: { fromDate?: string; toDate?: string } = {},
  ) {
    const customer = await sql<
      { id: string; name: string; outstanding_balance: string }[]
    >`
      SELECT id, name, outstanding_balance FROM customers
      WHERE id = ${customerId} AND tenant_id = ${tenantId}
    `;
    if (customer.length === 0) {
      throw AppError.notFound("Customer not found");
    }

    const invoices = await sql<InvoiceRow[]>`
      SELECT * FROM invoices
      WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}
        AND status != 'draft' AND status != 'cancelled'
      ${query.fromDate ? sql`AND invoice_date >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND invoice_date <= ${query.toDate}` : sql``}
      ORDER BY invoice_date ASC
    `;

    const paymentsResult = await sql<PaymentRow[]>`
      SELECT * FROM payments
      WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}
      ${query.fromDate ? sql`AND payment_date >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND payment_date <= ${query.toDate}` : sql``}
      ORDER BY payment_date ASC
    `;

    const entries: Array<{
      date: string;
      type: "invoice" | "payment";
      reference: string;
      debit: number;
      credit: number;
    }> = [];

    for (const inv of invoices) {
      entries.push({
        date: inv.invoice_date,
        type: "invoice",
        reference: inv.invoice_number,
        debit: parseFloat(inv.total_amount),
        credit: 0,
      });
    }

    for (const pmt of paymentsResult) {
      entries.push({
        date: pmt.payment_date,
        type: "payment",
        reference: pmt.reference_number || pmt.payment_method,
        debit: 0,
        credit: parseFloat(pmt.amount),
      });
    }

    entries.sort((a, b) => a.date.localeCompare(b.date));

    return {
      customer: {
        id: customer[0].id,
        name: customer[0].name,
        outstandingBalance: parseFloat(customer[0].outstanding_balance),
      },
      entries,
    };
  }

  private async generateInvoiceNumber(
    tenantId: string,
    tx: TxSql,
  ): Promise<string> {
    const result = await tx<{ max_num: string | null }[]>`
      SELECT MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)) as max_num
      FROM invoices WHERE tenant_id = ${tenantId}
    `;
    const nextNum =
      (result[0].max_num ? parseInt(result[0].max_num, 10) : 0) + 1;
    return `INV-${String(nextNum).padStart(5, "0")}`;
  }
}
