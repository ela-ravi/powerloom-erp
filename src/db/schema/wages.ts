import {
  pgTable,
  uuid,
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

export const advanceTypeEnum = pgEnum("advance_type", [
  "advance_given",
  "advance_deduction",
  "discretionary_addition",
]);

export const wageCycleStatusEnum = pgEnum("wage_cycle_status", [
  "draft",
  "review",
  "approved",
  "paid",
]);

export const workerTypeEnum = pgEnum("worker_type", [
  "wager",
  "tailor",
  "packager",
  "paavu_oati",
]);

export const advanceTransactions = pgTable(
  "advance_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    wagerId: uuid("wager_id").notNull(),
    type: advanceTypeEnum("type").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    balanceAfter: decimal("balance_after", {
      precision: 12,
      scale: 2,
    }).notNull(),
    referenceId: uuid("reference_id"),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_advance_transactions_tenant_wager").on(
      table.tenantId,
      table.wagerId,
    ),
    index("idx_advance_transactions_tenant_created").on(
      table.tenantId,
      table.createdAt,
    ),
  ],
);

export const wageCycles = pgTable(
  "wage_cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    cycleNumber: integer("cycle_number").notNull(),
    cycleStartDate: date("cycle_start_date").notNull(),
    cycleEndDate: date("cycle_end_date").notNull(),
    status: wageCycleStatusEnum("status").notNull().default("draft"),
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
    uniqueIndex("idx_wage_cycles_tenant_number").on(
      table.tenantId,
      table.cycleNumber,
    ),
    index("idx_wage_cycles_tenant_status").on(table.tenantId, table.status),
    index("idx_wage_cycles_tenant_dates").on(
      table.tenantId,
      table.cycleStartDate,
      table.cycleEndDate,
    ),
  ],
);

export const wageRecords = pgTable(
  "wage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    wageCycleId: uuid("wage_cycle_id")
      .notNull()
      .references(() => wageCycles.id),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => users.id),
    workerType: workerTypeEnum("worker_type").notNull(),
    grossWage: decimal("gross_wage", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    advanceDeduction: decimal("advance_deduction", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    damageDeduction: decimal("damage_deduction", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    netPayable: decimal("net_payable", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    discretionaryAmount: decimal("discretionary_amount", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    actualPaid: decimal("actual_paid", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_wage_records_tenant_cycle").on(
      table.tenantId,
      table.wageCycleId,
    ),
    index("idx_wage_records_tenant_worker").on(table.tenantId, table.workerId),
  ],
);
