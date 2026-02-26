import {
  pgTable,
  uuid,
  integer,
  decimal,
  boolean,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { users } from "./users.js";
import { products } from "./master-data.js";
import { productionReturns } from "./production.js";

export const detectionPointEnum = pgEnum("detection_point", [
  "loom",
  "tailoring",
  "packaging",
  "godown",
]);

export const damageGradeEnum = pgEnum("damage_grade", [
  "minor",
  "major",
  "reject",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
]);

export const damageRecords = pgTable(
  "damage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    productionReturnId: uuid("production_return_id").references(
      () => productionReturns.id,
    ),
    wagerId: uuid("wager_id").references(() => users.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    detectionPoint: detectionPointEnum("detection_point").notNull(),
    grade: damageGradeEnum("grade").notNull(),
    damageCount: integer("damage_count").notNull(),
    deductionRatePct: decimal("deduction_rate_pct", {
      precision: 5,
      scale: 2,
    }).notNull(),
    productionCostPerPiece: decimal("production_cost_per_piece", {
      precision: 10,
      scale: 2,
    }).notNull(),
    totalDeduction: decimal("total_deduction", {
      precision: 12,
      scale: 2,
    }).notNull(),
    approvalStatus: approvalStatusEnum("approval_status")
      .notNull()
      .default("pending"),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    isMiscellaneous: boolean("is_miscellaneous").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_damage_records_tenant_wager").on(table.tenantId, table.wagerId),
    index("idx_damage_records_tenant_status").on(
      table.tenantId,
      table.approvalStatus,
    ),
    index("idx_damage_records_tenant_detection").on(
      table.tenantId,
      table.detectionPoint,
    ),
    index("idx_damage_records_tenant_product").on(
      table.tenantId,
      table.productId,
    ),
    index("idx_damage_records_tenant_return").on(
      table.tenantId,
      table.productionReturnId,
    ),
  ],
);
