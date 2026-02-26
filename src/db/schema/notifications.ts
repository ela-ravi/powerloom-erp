import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { users } from "./users.js";

export const notificationPriorityEnum = pgEnum("notification_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const fraudSeverityEnum = pgEnum("fraud_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    priority: notificationPriorityEnum("priority").notNull().default("medium"),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    referenceType: varchar("reference_type", { length: 50 }),
    referenceId: uuid("reference_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_notifications_tenant_user").on(table.tenantId, table.userId),
    index("idx_notifications_tenant_event").on(table.tenantId, table.eventType),
  ],
);

export const fraudAlerts = pgTable(
  "fraud_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    alertType: varchar("alert_type", { length: 50 }).notNull(),
    severity: fraudSeverityEnum("severity").notNull().default("medium"),
    description: text("description").notNull(),
    referenceType: varchar("reference_type", { length: 50 }),
    referenceId: uuid("reference_id"),
    wagerId: uuid("wager_id"),
    isResolved: boolean("is_resolved").notNull().default(false),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_fraud_alerts_tenant").on(table.tenantId),
    index("idx_fraud_alerts_tenant_type").on(table.tenantId, table.alertType),
  ],
);
