import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";
import { products } from "./master-data.js";
import { batches } from "./batches.js";
import { users } from "./users.js";

export const inventoryStageEnum = pgEnum("inventory_stage", [
  "raw_cone",
  "paavu",
  "woven",
  "tailored",
  "bundled",
  "sold",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "increase",
  "decrease",
  "transfer_in",
  "transfer_out",
]);

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  godownId: uuid("godown_id").notNull(),
  productId: uuid("product_id").references(() => products.id),
  color: varchar("color", { length: 100 }).notNull(),
  stage: inventoryStageEnum("stage").notNull(),
  batchId: uuid("batch_id").references(() => batches.id),
  quantity: decimal("quantity", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  weightKg: decimal("weight_kg", { precision: 12, scale: 3 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  inventoryId: uuid("inventory_id")
    .notNull()
    .references(() => inventory.id),
  movementType: movementTypeEnum("movement_type").notNull(),
  quantityChange: decimal("quantity_change", {
    precision: 12,
    scale: 3,
  }).notNull(),
  weightChangeKg: decimal("weight_change_kg", { precision: 12, scale: 3 }),
  referenceType: varchar("reference_type", { length: 50 }).notNull(),
  referenceId: uuid("reference_id").notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const conePurchases = pgTable("cone_purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  supplierId: uuid("supplier_id").notNull(),
  godownId: uuid("godown_id").notNull(),
  productId: uuid("product_id").references(() => products.id),
  color: varchar("color", { length: 100 }).notNull(),
  batchId: uuid("batch_id").references(() => batches.id),
  quantityKg: decimal("quantity_kg", { precision: 12, scale: 3 }).notNull(),
  ratePerKg: decimal("rate_per_kg", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  gstRatePct: decimal("gst_rate_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("0.00"),
  gstAmount: decimal("gst_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  purchaseDate: date("purchase_date").notNull().defaultNow(),
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
});

export const interGodownTransfers = pgTable("inter_godown_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  sourceGodownId: uuid("source_godown_id").notNull(),
  destGodownId: uuid("dest_godown_id").notNull(),
  productId: uuid("product_id").references(() => products.id),
  color: varchar("color", { length: 100 }).notNull(),
  stage: inventoryStageEnum("stage").notNull(),
  batchId: uuid("batch_id").references(() => batches.id),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  weightKg: decimal("weight_kg", { precision: 12, scale: 3 }),
  notes: text("notes"),
  transferredBy: uuid("transferred_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
