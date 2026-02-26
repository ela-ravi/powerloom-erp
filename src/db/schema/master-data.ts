import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  integer,
  decimal,
  smallint,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";
import { users } from "./users.js";

// Enums
export const loomOwnershipEnum = pgEnum("loom_ownership", ["owner", "wager"]);
export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "operational",
  "under_maintenance",
  "idle",
]);
export const productCategoryEnum = pgEnum("product_category", [
  "single",
  "double",
  "triple",
  "quad",
]);
export const colorPricingModeEnum = pgEnum("color_pricing_mode", [
  "average",
  "per_color",
]);
export const shiftEnum = pgEnum("shift_type", ["morning", "evening", "night"]);
export const customerTypeEnum = pgEnum("customer_type", [
  "wholesale_partial",
  "wholesale_bill_to_bill",
  "retail",
]);
export const godownTypeEnum = pgEnum("godown_type", [
  "godown",
  "paavu_pattarai",
]);

// Tables
export const loomTypes = pgTable(
  "loom_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 100 }).notNull(),
    nickname: varchar("nickname", { length: 50 }),
    capacityPiecesPerDay: integer("capacity_pieces_per_day").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("loom_types_tenant_name_unique").on(table.tenantId, table.name),
  ],
);

export const looms = pgTable(
  "looms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    loomTypeId: uuid("loom_type_id")
      .notNull()
      .references(() => loomTypes.id),
    loomNumber: varchar("loom_number", { length: 50 }).notNull(),
    assignedWagerId: uuid("assigned_wager_id").references(() => users.id),
    ownership: loomOwnershipEnum("ownership").notNull(),
    maintenanceStatus: maintenanceStatusEnum("maintenance_status")
      .notNull()
      .default("operational"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("looms_tenant_number_unique").on(table.tenantId, table.loomNumber),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 255 }).notNull(),
    size: varchar("size", { length: 20 }).notNull(),
    category: productCategoryEnum("category").notNull(),
    paavuToPieceRatio: decimal("paavu_to_piece_ratio", {
      precision: 10,
      scale: 4,
    }).notNull(),
    paavuConsumptionGrams: decimal("paavu_consumption_grams", {
      precision: 10,
      scale: 2,
    }).notNull(),
    paavuWastageGrams: decimal("paavu_wastage_grams", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    paavuWastagePct: decimal("paavu_wastage_pct", { precision: 5, scale: 2 }),
    oodaiConsumptionGrams: decimal("oodai_consumption_grams", {
      precision: 10,
      scale: 2,
    }).notNull(),
    oodaiWastageGrams: decimal("oodai_wastage_grams", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    oodaiWastagePct: decimal("oodai_wastage_pct", { precision: 5, scale: 2 }),
    wageRatePerKg: decimal("wage_rate_per_kg", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    wageRatePerPiece: decimal("wage_rate_per_piece", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    stitchRatePerPiece: decimal("stitch_rate_per_piece", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    knotRatePerPiece: decimal("knot_rate_per_piece", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    smallBundleCount: integer("small_bundle_count").notNull().default(10),
    largeBundleCount: integer("large_bundle_count").notNull().default(50),
    bundleRateSmall: decimal("bundle_rate_small", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    bundleRateLarge: decimal("bundle_rate_large", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    gstRatePct: decimal("gst_rate_pct", { precision: 5, scale: 2 })
      .notNull()
      .default("5.00"),
    colorPricingMode: colorPricingModeEnum("color_pricing_mode")
      .notNull()
      .default("average"),
    hsnCode: varchar("hsn_code", { length: 20 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("products_tenant_name_size_unique").on(
      table.tenantId,
      table.name,
      table.size,
    ),
  ],
);

export const productColorPrices = pgTable(
  "product_color_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    color: varchar("color", { length: 50 }).notNull(),
    sellingPricePerPiece: decimal("selling_price_per_piece", {
      precision: 10,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("color_prices_product_color_unique").on(
      table.productId,
      table.color,
    ),
  ],
);

export const shiftWageRates = pgTable(
  "shift_wage_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    shift: shiftEnum("shift").notNull(),
    wageRatePerKg: decimal("wage_rate_per_kg", {
      precision: 10,
      scale: 2,
    }).notNull(),
    wageRatePerPiece: decimal("wage_rate_per_piece", {
      precision: 10,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("shift_rates_product_shift_unique").on(table.productId, table.shift),
  ],
);

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 15 }),
  address: text("address"),
  gstin: varchar("gstin", { length: 15 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 15 }),
  address: text("address"),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  gstin: varchar("gstin", { length: 15 }),
  customerType: customerTypeEnum("customer_type").notNull(),
  creditPeriodDays: integer("credit_period_days").notNull().default(30),
  outstandingBalance: decimal("outstanding_balance", {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const godowns = pgTable("godowns", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  isMain: boolean("is_main").notNull().default(false),
  godownType: godownTypeEnum("godown_type").notNull().default("godown"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const wagerProfiles = pgTable("wager_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  wagerType: smallint("wager_type").notNull(),
  advanceBalance: decimal("advance_balance", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  originalAdvance: decimal("original_advance", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  additionalAdvances: decimal("additional_advances", {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const paavuOatiProfiles = pgTable("paavu_oati_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  advanceBalance: decimal("advance_balance", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  originalAdvance: decimal("original_advance", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  additionalAdvances: decimal("additional_advances", {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
