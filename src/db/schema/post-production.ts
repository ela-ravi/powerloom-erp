import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  boolean,
  text,
  date,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { users } from "./users.js";
import { products } from "./master-data.js";
import { batches } from "./batches.js";

export const bundleTypeEnum = pgEnum("bundle_type", ["small", "large"]);

export const tailoringRecords = pgTable(
  "tailoring_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    tailorId: uuid("tailor_id")
      .notNull()
      .references(() => users.id),
    godownId: uuid("godown_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    color: varchar("color", { length: 100 }).notNull(),
    batchId: uuid("batch_id").references(() => batches.id),
    stitchCount: integer("stitch_count").notNull(),
    knotCount: integer("knot_count").notNull().default(0),
    stitchWage: decimal("stitch_wage", { precision: 10, scale: 2 }).notNull(),
    knotWage: decimal("knot_wage", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    totalWage: decimal("total_wage", { precision: 10, scale: 2 }).notNull(),
    mismatchDetected: boolean("mismatch_detected").notNull().default(false),
    workDate: date("work_date").notNull().defaultNow(),
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
    index("idx_tailoring_records_tenant_tailor").on(
      table.tenantId,
      table.tailorId,
    ),
    index("idx_tailoring_records_tenant_date").on(
      table.tenantId,
      table.workDate,
    ),
    index("idx_tailoring_records_tenant_product").on(
      table.tenantId,
      table.productId,
    ),
  ],
);

export const packagingRecords = pgTable(
  "packaging_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    packagerId: uuid("packager_id")
      .notNull()
      .references(() => users.id),
    godownId: uuid("godown_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    color: varchar("color", { length: 100 }).notNull(),
    batchId: uuid("batch_id").references(() => batches.id),
    bundleType: bundleTypeEnum("bundle_type").notNull(),
    bundleCount: integer("bundle_count").notNull(),
    piecesPerBundle: integer("pieces_per_bundle").notNull(),
    totalPieces: integer("total_pieces").notNull(),
    bundleRate: decimal("bundle_rate", { precision: 10, scale: 2 }).notNull(),
    totalWage: decimal("total_wage", { precision: 10, scale: 2 }).notNull(),
    workDate: date("work_date").notNull().defaultNow(),
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
    index("idx_packaging_records_tenant_packager").on(
      table.tenantId,
      table.packagerId,
    ),
    index("idx_packaging_records_tenant_date").on(
      table.tenantId,
      table.workDate,
    ),
    index("idx_packaging_records_tenant_product").on(
      table.tenantId,
      table.productId,
    ),
  ],
);
