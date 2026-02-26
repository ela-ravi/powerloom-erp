import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  text,
  date,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { users } from "./users.js";
import { customers, products } from "./master-data.js";
import { batches } from "./batches.js";

export const taxTypeEnum = pgEnum("tax_type", ["intra_state", "inter_state"]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "upi",
  "bank_transfer",
  "cheque",
  "other",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    invoiceDate: date("invoice_date").notNull().defaultNow(),
    dueDate: date("due_date").notNull(),
    taxType: taxTypeEnum("tax_type").notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    cgstAmount: decimal("cgst_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    sgstAmount: decimal("sgst_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    igstAmount: decimal("igst_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    balanceDue: decimal("balance_due", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    ewayBillNumber: varchar("eway_bill_number", { length: 50 }),
    batchId: uuid("batch_id").references(() => batches.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_invoices_tenant_number").on(
      table.tenantId,
      table.invoiceNumber,
    ),
    index("idx_invoices_tenant_customer").on(table.tenantId, table.customerId),
    index("idx_invoices_tenant_status").on(table.tenantId, table.status),
    index("idx_invoices_tenant_due_date").on(table.tenantId, table.dueDate),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    color: varchar("color", { length: 50 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
    gstRatePct: decimal("gst_rate_pct", { precision: 5, scale: 2 }).notNull(),
    hsnCode: varchar("hsn_code", { length: 20 }),
    batchId: uuid("batch_id").references(() => batches.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_invoice_items_tenant_invoice").on(
      table.tenantId,
      table.invoiceId,
    ),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    paymentDate: date("payment_date").notNull().defaultNow(),
    referenceNumber: varchar("reference_number", { length: 100 }),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_payments_tenant_invoice").on(table.tenantId, table.invoiceId),
    index("idx_payments_tenant_customer").on(table.tenantId, table.customerId),
    index("idx_payments_tenant_date").on(table.tenantId, table.paymentDate),
  ],
);
