import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  smallint,
  integer,
  decimal,
} from "drizzle-orm/pg-core";

export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "suspended",
  "trial",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  gstin: varchar("gstin", { length: 15 }),
  status: tenantStatusEnum("status").notNull().default("trial"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tenantSettings = pgTable("tenant_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .unique()
    .references(() => tenants.id),
  batchEnabled: boolean("batch_enabled").notNull().default(false),
  shiftEnabled: boolean("shift_enabled").notNull().default(false),
  interGodownTransferEnabled: boolean("inter_godown_transfer_enabled")
    .notNull()
    .default(false),
  authOtpEnabled: boolean("auth_otp_enabled").notNull().default(true),
  authPinEnabled: boolean("auth_pin_enabled").notNull().default(false),
  wageCycleDay: smallint("wage_cycle_day").notNull().default(0),
  defaultCreditPeriodDays: integer("default_credit_period_days")
    .notNull()
    .default(30),
  paavuWastageLimitGrams: integer("paavu_wastage_limit_grams")
    .notNull()
    .default(500),
  damageMinorDeductionPct: decimal("damage_minor_deduction_pct", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("25.00"),
  damageMajorDeductionPct: decimal("damage_major_deduction_pct", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("50.00"),
  damageRejectDeductionPct: decimal("damage_reject_deduction_pct", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("100.00"),
  ratePerPaavu: decimal("rate_per_paavu", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  showWagerRanking: boolean("show_wager_ranking").notNull().default(false),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  locale: varchar("locale", { length: 10 }).notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
