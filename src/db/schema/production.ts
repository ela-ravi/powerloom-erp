import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  timestamp,
  date,
  time,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { users } from "./users.js";
import { products } from "./master-data.js";
import { batches } from "./batches.js";

export const downtimeReasonEnum = pgEnum("downtime_reason", [
  "mechanical",
  "electrical",
  "material_shortage",
  "other",
]);

export const shifts = pgTable("shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: varchar("name", { length: 100 }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const coneIssuances = pgTable("cone_issuances", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  wagerId: uuid("wager_id")
    .notNull()
    .references(() => users.id),
  godownId: uuid("godown_id").notNull(),
  totalQuantityKg: decimal("total_quantity_kg", {
    precision: 12,
    scale: 3,
  }).notNull(),
  issuedBy: uuid("issued_by")
    .notNull()
    .references(() => users.id),
  issuedAt: timestamp("issued_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const coneIssuanceItems = pgTable("cone_issuance_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  coneIssuanceId: uuid("cone_issuance_id")
    .notNull()
    .references(() => coneIssuances.id, { onDelete: "cascade" }),
  godownId: uuid("godown_id").notNull(),
  color: varchar("color", { length: 100 }).notNull(),
  batchId: uuid("batch_id").references(() => batches.id),
  quantityKg: decimal("quantity_kg", { precision: 12, scale: 3 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const paavuProductions = pgTable("paavu_productions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  paavuOatiId: uuid("paavu_oati_id")
    .notNull()
    .references(() => users.id),
  godownId: uuid("godown_id").notNull(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  color: varchar("color", { length: 100 }).notNull(),
  batchId: uuid("batch_id").references(() => batches.id),
  coneWeightKg: decimal("cone_weight_kg", {
    precision: 12,
    scale: 3,
  }).notNull(),
  paavuCount: integer("paavu_count").notNull(),
  wastageGrams: decimal("wastage_grams", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  wastageFlagged: boolean("wastage_flagged").notNull().default(false),
  productionDate: date("production_date").notNull().defaultNow(),
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

export const productionReturns = pgTable("production_returns", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  wagerId: uuid("wager_id")
    .notNull()
    .references(() => users.id),
  loomId: uuid("loom_id").notNull(),
  godownId: uuid("godown_id").notNull(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  color: varchar("color", { length: 100 }).notNull(),
  batchId: uuid("batch_id").references(() => batches.id),
  shiftId: uuid("shift_id"),
  pieceCount: integer("piece_count"),
  weightKg: decimal("weight_kg", { precision: 12, scale: 3 }),
  wastageKg: decimal("wastage_kg", { precision: 10, scale: 3 })
    .notNull()
    .default("0"),
  wastageFlagged: boolean("wastage_flagged").notNull().default(false),
  returnDate: date("return_date").notNull().defaultNow(),
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

export const loomDowntimes = pgTable("loom_downtimes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  loomId: uuid("loom_id").notNull(),
  wagerId: uuid("wager_id").references(() => users.id),
  reason: downtimeReasonEnum("reason").notNull(),
  customReason: varchar("custom_reason", { length: 255 }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  durationMinutes: integer("duration_minutes"),
  reportedBy: uuid("reported_by")
    .notNull()
    .references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
