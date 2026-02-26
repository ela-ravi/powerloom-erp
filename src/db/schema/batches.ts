import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { products } from "./master-data.js";

export const batchStatusEnum = pgEnum("batch_status", [
  "open",
  "in_progress",
  "closed",
]);

export const batches = pgTable(
  "batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    batchNumber: varchar("batch_number", { length: 50 }).notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    status: batchStatusEnum("status").notNull().default("open"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("batches_tenant_number_unique").on(
      table.tenantId,
      table.batchNumber,
    ),
  ],
);
