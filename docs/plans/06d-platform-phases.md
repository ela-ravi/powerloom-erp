# Platform Phases — Powerloom ERP V3

> Phases 10–14: Notifications + Reports + Jobs + Indexes + Swagger
>
> Back to [Implementation Guide](./06-implementation-guide.md) | Prev: [Financial Phases](./06c-financial-phases.md)

---

## Phase 10: Notifications & Alerts

> **Dependencies:** Phase 8 (Wage & Advance), Phase 9 (Sales & Finance)
> **Epics:** DB Epic 10 + BE Epic 12
> **CL-DB:** 15.1–15.8 (8 items) | **CL-BE:** 12.1–12.8 (8 items)
> **Endpoints:** 6 | **Unit Tests:** ~25 | **Integration Tests:** IT-12.1–IT-12.4

### Overview

The notification system creates user-targeted notifications for 11 business event types and detects 7 fraud/anomaly alert types. Notifications are user-scoped (via RLS), support read/unread state, priority levels, and integrate with Firebase Cloud Messaging (FCM) for mobile push.

### DB Tables

**`notifications`**

| Column           | Type           | Notes                                   |
| ---------------- | -------------- | --------------------------------------- |
| `id`             | `uuid`         | PK                                      |
| `tenant_id`      | `uuid`         | FK → tenants                            |
| `user_id`        | `uuid`         | FK → users (recipient)                  |
| `event_type`     | `varchar(50)`  | 11 event types                          |
| `title`          | `varchar(255)` | Notification title                      |
| `message`        | `text`         | Notification body                       |
| `priority`       | `enum`         | `low`, `medium`, `high`, `urgent`       |
| `is_read`        | `boolean`      | Default `false`                         |
| `read_at`        | `timestamptz`  | Nullable                                |
| `reference_type` | `varchar(50)`  | Entity type (invoice, wage_cycle, etc.) |
| `reference_id`   | `uuid`         | Entity ID                               |
| `created_at`     | `timestamptz`  |                                         |

**`fraud_alerts`**

| Column           | Type          | Notes                               |
| ---------------- | ------------- | ----------------------------------- |
| `id`             | `uuid`        | PK                                  |
| `tenant_id`      | `uuid`        | FK → tenants                        |
| `alert_type`     | `varchar(50)` | 7 fraud types                       |
| `severity`       | `enum`        | `low`, `medium`, `high`, `critical` |
| `description`    | `text`        | Alert details                       |
| `reference_type` | `varchar(50)` | Entity type                         |
| `reference_id`   | `uuid`        | Entity ID                           |
| `wager_id`       | `uuid`        | Nullable FK → wager_profiles        |
| `is_resolved`    | `boolean`     | Default `false`                     |
| `resolved_by`    | `uuid`        | Nullable FK → users                 |
| `resolved_at`    | `timestamptz` | Nullable                            |
| `created_at`     | `timestamptz` |                                     |

### 11 Notification Event Types

| #   | Event                       | Recipient            | Priority |
| --- | --------------------------- | -------------------- | -------- |
| 1   | Credit due approaching      | Owner + accountant   | medium   |
| 2   | Credit overdue              | Owner + accountant   | high     |
| 3   | Wage cycle ready for review | Owner                | medium   |
| 4   | Wage approved/paid          | Worker               | medium   |
| 5   | Damage reported             | Owner                | high     |
| 6   | Fraud alert detected        | Owner                | urgent   |
| 7   | Production return recorded  | Owner/Staff          | low      |
| 8   | Advance balance low         | Wager                | medium   |
| 9   | Downtime reported           | Owner                | medium   |
| 10  | Inventory mismatch          | Owner + godown staff | high     |
| 11  | Batch status changed        | Owner                | low      |

### 7 Fraud Alert Types

| #   | Type               | Trigger                      |
| --- | ------------------ | ---------------------------- |
| 1   | Color substitution | Return color != issued color |
| 2   | Excess wastage     | Wastage > threshold          |
| 3   | Underproduction    | Output < expected from input |
| 4   | High damage %      | Wager damage % > threshold   |
| 5   | Loom inefficiency  | Utilization < threshold      |
| 6   | Inventory mismatch | Physical != system count     |
| 7   | Customer overdue   | Chronic overdue pattern      |

### Skills to Invoke

| Order | Command                                                        | Purpose                           |
| ----- | -------------------------------------------------------------- | --------------------------------- |
| 1     | `/generate-test notifications unit`                            | RED: Notification CRUD tests      |
| 2     | `/generate-test fraud-alerts unit`                             | RED: Fraud detection tests        |
| 3     | `/db-migration notifications`                                  | GREEN: Create notifications table |
| 4     | `/db-migration fraud_alerts`                                   | GREEN: Create fraud alerts table  |
| 5     | `/scaffold-module notifications`                               | GREEN: Notification endpoints     |
| 6     | `/scaffold-module fraud-alerts`                                | GREEN: Fraud alert endpoints      |
| 7     | `/generate-test notifications integration`                     | Integration tests                 |
| 8     | `/add-translation notification.unread "Unread" "படிக்கவில்லை"` | i18n                              |

### Agent Activation Flow

**Proactive:** `db-reviewer`, `business-logic-validator`, `test-runner`
**Manual:** `domain-expert` (notification event rules), `checklist-validator` (CL-DB-15, CL-BE-12)

### TDD Steps

#### RED — Write Failing Tests

```bash
/generate-test notifications unit
# - List returns only current user's notifications
# - Unread count returns correct count
# - Mark as read → is_read=true, read_at set
# - Mark all as read
# - Each of 11 event types creates correct notification
# - FCM push triggered on creation

/generate-test fraud-alerts unit
# - Each of 7 alert types detected and created
# - Owner can view alerts
# - Authorized staff can view alerts
# - Wager/tailor/packager cannot view → 403
# - Resolve sets is_resolved=true
```

#### GREEN — Implement

```bash
/db-migration notifications
/db-migration fraud_alerts
/scaffold-module notifications
/scaffold-module fraud-alerts
# Implement NotificationTriggerService (called from other services)
# Implement FraudDetectionService (called from production, damage, etc.)
# Implement FCM push integration (PushNotificationService)
```

#### REFACTOR

- Extract notification creation into `NotificationTriggerService.emit(event, data)` pattern
- Create fraud detection rules as configurable thresholds per tenant

### Endpoints

| Method | Path                              | Auth                     | Purpose                |
| ------ | --------------------------------- | ------------------------ | ---------------------- |
| `GET`  | `/api/notifications`              | Any authenticated        | List own notifications |
| `GET`  | `/api/notifications/unread-count` | Any authenticated        | Badge count            |
| `PUT`  | `/api/notifications/:id/read`     | Any authenticated        | Mark as read           |
| `PUT`  | `/api/notifications/read-all`     | Any authenticated        | Mark all as read       |
| `GET`  | `/api/fraud-alerts`               | Owner, Staff(authorized) | List fraud alerts      |
| `PUT`  | `/api/fraud-alerts/:id/resolve`   | Owner                    | Resolve alert          |

### Integration Tests

| ID      | Test                                                              | What It Validates           |
| ------- | ----------------------------------------------------------------- | --------------------------- |
| IT-12.1 | Business event → notification created → user reads → mark as read | Full notification lifecycle |
| IT-12.2 | All 11 notification event types → correct recipients              | Event routing               |
| IT-12.3 | All 7 fraud alert types → detected and created                    | Fraud detection coverage    |
| IT-12.4 | Fraud alert access control → role-based visibility                | Authorization               |

### Verification Gate

- [ ] All unit tests pass
- [ ] All integration tests pass (IT-12.1 through IT-12.4)
- [ ] Curl manual testing done for all 6 endpoints
- [ ] `db-reviewer` approved 2 migrations
- [ ] `business-logic-validator` approved fraud detection rules
- [ ] `checklist-validator` confirmed CL-DB-15 (8/8) + CL-BE-12 (8/8)
- [ ] All 11 notification events trigger correctly
- [ ] All 7 fraud alert types detect correctly
- [ ] RLS ensures users see only own notifications
- [ ] Fraud alerts hidden from wager/tailor/packager roles

---

## Phase 11: Reports

> **Dependencies:** Phases 5–9 (all operational data must exist)
> **Epics:** BE Epic 13
> **CL-DB:** 17.1–17.15 (15 items) | **CL-BE:** 13.1–13.16 (16 items)
> **Endpoints:** 14 | **Unit Tests:** ~30 | **Integration Tests:** IT-13.1–IT-13.3

### Overview

14 read-only report endpoints across 4 categories. All reports are tenant-scoped, support date range filtering, and return aggregated data. No new DB tables — reports query existing tables.

### Report Categories

#### Production Reports (4 endpoints)

| Endpoint                                 | Purpose                     | Source Tables                                                    |
| ---------------------------------------- | --------------------------- | ---------------------------------------------------------------- |
| `GET /api/reports/production-summary`    | Daily/weekly/monthly totals | `production_returns`                                             |
| `GET /api/reports/batch-profitability`   | Revenue - cost per batch    | `batches` + `cone_purchases` + `production_returns` + `invoices` |
| `GET /api/reports/color-profitability`   | Profit per color            | `production_returns` + `invoices`                                |
| `GET /api/reports/product-profitability` | Profit per product          | `production_returns` + `invoices`                                |

#### Wager Reports (4 endpoints)

| Endpoint                               | Purpose                | Source Tables                                          |
| -------------------------------------- | ---------------------- | ------------------------------------------------------ |
| `GET /api/reports/wage-sheet/:cycleId` | Printable wage sheet   | `wage_cycles` + `wage_records`                         |
| `GET /api/reports/wager-damage`        | Damage % per wager     | `damage_records` / `production_returns`                |
| `GET /api/reports/wager-utilization`   | Capacity utilization % | `production_returns` + `loom_types` + `loom_downtimes` |
| `GET /api/reports/wager-advance`       | Advance balance list   | `wager_profiles`                                       |

#### Inventory Reports (3 endpoints)

| Endpoint                          | Purpose          | Source Tables                |
| --------------------------------- | ---------------- | ---------------------------- |
| `GET /api/reports/cone-stock`     | By color, godown | `inventory` (stage=raw_cone) |
| `GET /api/reports/finished-stock` | By stage         | `inventory` grouped by stage |
| `GET /api/reports/stock-movement` | Movement history | `inventory_movements`        |

#### Finance Reports (3 endpoints)

| Endpoint                           | Purpose                | Source Tables                |
| ---------------------------------- | ---------------------- | ---------------------------- |
| `GET /api/reports/gst-summary`     | CGST/SGST/IGST breakup | `invoices` + `invoice_items` |
| `GET /api/reports/supplier-ledger` | Per-supplier spend     | `cone_purchases`             |
| `GET /api/reports/revenue`         | Revenue by period      | `invoices` + `payments`      |

Note: `GET /api/reports/customer-aging` was implemented in Phase 9.

### Skills to Invoke

| Order | Command                                             | Purpose                           |
| ----- | --------------------------------------------------- | --------------------------------- |
| 1     | `/generate-test reports unit`                       | RED: Report calculation tests     |
| 2     | `/scaffold-module reports`                          | GREEN: Report routes and services |
| 3     | `/api-endpoint GET /api/reports/production-summary` | GREEN: Each report endpoint       |
| 4–14  | `/api-endpoint GET /api/reports/[name]`             | GREEN: Remaining report endpoints |
| 15    | `/generate-test reports integration`                | Integration tests                 |

### Agent Activation Flow

**Proactive:** `test-runner`
**Manual:** `checklist-validator` (CL-DB-17, CL-BE-13), `domain-expert` (report formulas)

### TDD Steps

#### RED — Write Failing Tests

```bash
/generate-test reports unit
# Test each report returns correct aggregated data
# Test batch report only when batch_enabled → 400 otherwise
# Test shift-wise report only when shift_enabled → 400 otherwise
# Test date range filtering
# Test report access control (owner + permitted staff only)
```

#### GREEN — Implement

```bash
/scaffold-module reports
# Create 4 report service classes:
# - ProductionReportService
# - WagerReportService
# - InventoryReportService
# - FinanceReportService
# Each with methods for their respective endpoints
```

#### REFACTOR

- Extract common date range filtering into shared utility
- Extract common pagination logic
- Optimize complex aggregation queries with proper indexes (Phase 13)

### Endpoints

All 14 endpoints use `GET` method, require Owner or Staff(reports) authorization.

### Integration Tests

| ID      | Test                                                     | What It Validates   |
| ------- | -------------------------------------------------------- | ------------------- |
| IT-13.1 | Generate production data → run reports → verify accuracy | Report calculations |
| IT-13.2 | Report access control → owner and permitted staff only   | Authorization       |
| IT-13.3 | Reports with batch filter → correct when batch_enabled   | Feature flag        |

### Verification Gate

- [ ] All unit tests pass
- [ ] All integration tests pass (IT-13.1 through IT-13.3)
- [ ] Curl manual testing done for all 14 endpoints
- [ ] `checklist-validator` confirmed CL-DB-17 (15/15) + CL-BE-13 (16/16)
- [ ] All report calculations verified against manual calculations
- [ ] Feature flag conditions enforced (batch, shift)
- [ ] Date range filtering works correctly

---

## Phase 12: Scheduled Jobs

> **Dependencies:** Phase 8, Phase 9, Phase 10
> **Epics:** BE Epic 14
> **Endpoints:** 0 (background jobs only) | **Unit Tests:** ~10

### Overview

Set up scheduled background jobs using `node-cron` (or bull queue for production). 4 recurring tasks handle automated processes that run without user interaction.

### Job Definitions

| Job                        | Schedule                      | What It Does                                                                       |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| Wage Cycle Auto-Generation | Per tenant's `wage_cycle_day` | Creates draft wage cycle for each tenant on their configured day                   |
| Overdue Invoice Detection  | Daily at 00:00                | Finds invoices past `due_date` with `balance_due > 0`, updates status to `overdue` |
| Credit Due Approaching     | Daily at 08:00                | Finds invoices due within 3 days, sends notification to owner                      |
| Fraud Detection Scan       | Daily at 02:00                | Runs all 7 fraud detection checks across tenants                                   |

### Skills to Invoke

| Order | Command                              | Purpose                        |
| ----- | ------------------------------------ | ------------------------------ |
| 1     | `/generate-test scheduled-jobs unit` | RED: Job execution tests       |
| 2     | Implement job scheduler setup        | GREEN: node-cron configuration |
| 3     | Implement job execution logging      | GREEN: Track job runs          |

### TDD Steps

#### RED — Write Failing Tests

```bash
/generate-test scheduled-jobs unit
# - Job scheduler executes at correct intervals
# - Wage cycle auto-generated on correct day per tenant
# - Overdue detection finds correct invoices
# - Credit approaching notification sent at correct timing
# - Fraud scans execute all 7 checks
# - Job execution logged (start, end, status, errors)
```

#### GREEN — Implement

```bash
# 1. Install node-cron
# pnpm add node-cron @types/node-cron -D

# 2. Create job infrastructure
# src/jobs/
#   scheduler.ts          - Cron setup
#   wage-cycle.job.ts     - Auto-generation
#   overdue.job.ts        - Invoice check
#   credit-due.job.ts     - Approaching notification
#   fraud-scan.job.ts     - Detection scans
#   job-logger.ts         - Execution logging

# 3. Each job iterates over active tenants and runs tenant-scoped
```

#### REFACTOR

- Ensure all jobs are idempotent (safe to re-run)
- Add error isolation (one tenant's failure doesn't affect others)
- Add job execution metrics

### Verification Gate

- [ ] All unit tests pass
- [ ] Each job runs correctly in isolation
- [ ] Jobs are idempotent
- [ ] Error in one tenant doesn't affect others
- [ ] Job execution is logged

---

## Phase 13: Performance Indexes

> **Dependencies:** Phases 1–9 (all tables must exist)
> **Epics:** DB Epic 11
> **Endpoints:** 0 | **Purpose:** Query optimization

### Overview

Add composite indexes to optimize high-traffic queries. These should be added after the data model is stable to avoid unnecessary index maintenance during development.

### Index Plan

#### Inventory Queries (highest traffic)

```sql
-- Stock lookup by dimensions
CREATE INDEX idx_inventory_lookup
  ON inventory(tenant_id, godown_id, product_id, color, stage)
  WHERE is_active = true;

-- Stage summary
CREATE INDEX idx_inventory_stage
  ON inventory(tenant_id, stage);

-- Batch-filtered inventory
CREATE INDEX idx_inventory_batch
  ON inventory(tenant_id, batch_id)
  WHERE batch_id IS NOT NULL;
```

#### Production Queries

```sql
-- Production returns by wager and date
CREATE INDEX idx_production_returns_wager_date
  ON production_returns(tenant_id, wager_id, created_at DESC);

-- Production returns by batch
CREATE INDEX idx_production_returns_batch
  ON production_returns(tenant_id, batch_id)
  WHERE batch_id IS NOT NULL;
```

#### Financial Queries

```sql
-- Invoices by customer and status
CREATE INDEX idx_invoices_customer_status
  ON invoices(tenant_id, customer_id, status);

-- Invoices by due date (for overdue detection)
CREATE INDEX idx_invoices_due_date
  ON invoices(tenant_id, due_date)
  WHERE status IN ('issued', 'partially_paid');

-- Payments by invoice
CREATE INDEX idx_payments_invoice
  ON payments(tenant_id, invoice_id);
```

#### Wage Queries

```sql
-- Wage records by cycle and worker
CREATE INDEX idx_wage_records_cycle
  ON wage_records(tenant_id, wage_cycle_id, worker_type);

-- Advance transactions by wager
CREATE INDEX idx_advance_transactions_wager
  ON advance_transactions(tenant_id, wager_id, created_at DESC);
```

#### Notification Queries

```sql
-- Unread notifications per user
CREATE INDEX idx_notifications_user_unread
  ON notifications(tenant_id, user_id, is_read)
  WHERE is_read = false;

-- Fraud alerts unresolved
CREATE INDEX idx_fraud_alerts_unresolved
  ON fraud_alerts(tenant_id, is_resolved)
  WHERE is_resolved = false;
```

#### General Indexes

```sql
-- Users by tenant and role
CREATE INDEX idx_users_tenant_role
  ON users(tenant_id, role)
  WHERE is_active = true;

-- Audit logs by entity
CREATE INDEX idx_audit_logs_entity
  ON audit_logs(tenant_id, entity_type, entity_id);

-- Damage records by wager
CREATE INDEX idx_damage_records_wager
  ON damage_records(tenant_id, wager_id, approval_status);
```

### Skills to Invoke

| Order | Command                             | Purpose                             |
| ----- | ----------------------------------- | ----------------------------------- |
| 1     | `/db-migration performance_indexes` | Create all indexes in one migration |

### Agent Activation Flow

**Proactive:** `db-reviewer` (validates index choices, checks for missing indexes)
**Manual:** `devils-advocate` (challenge index strategy, check for over-indexing)

### Verification Gate

- [ ] All indexes created successfully
- [ ] `db-reviewer` approved index migration
- [ ] No duplicate or redundant indexes
- [ ] Key queries show improved EXPLAIN ANALYZE results
- [ ] No significant insert/update performance degradation

---

## Phase 14: API Documentation — Swagger

> **Dependencies:** Phases 0–12 (all endpoints must exist)
> **Endpoints:** 1 (`GET /api/docs`)

### Overview

Add Swagger/OpenAPI documentation using `swagger-jsdoc` + `swagger-ui-express`. Every endpoint gets JSDoc annotations with request/response schemas, authentication requirements, and error responses.

### Setup

```bash
# Install packages
pnpm add swagger-jsdoc swagger-ui-express
pnpm add @types/swagger-jsdoc @types/swagger-ui-express -D
```

### Configuration

```typescript
// src/config/swagger.ts
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Powerloom ERP API",
      version: "1.0.0",
      description: "Multi-tenant ERP for powerloom textile manufacturing",
    },
    servers: [{ url: "/api", description: "API base path" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Tenants", description: "Tenant management" },
      { name: "Users", description: "User management" },
      {
        name: "Master Data",
        description: "Loom types, products, suppliers, customers, godowns",
      },
      { name: "Batches", description: "Batch lifecycle management" },
      { name: "Inventory", description: "Stock management and movements" },
      {
        name: "Production",
        description: "Cone issuance, paavu, returns, downtime",
      },
      { name: "Damage", description: "Damage recording and approval" },
      { name: "Post-Production", description: "Tailoring and packaging" },
      { name: "Wages", description: "Advance and wage cycle management" },
      { name: "Sales", description: "Invoices and payments" },
      { name: "Notifications", description: "Notifications and fraud alerts" },
      { name: "Reports", description: "All report endpoints" },
    ],
  },
  apis: ["./src/modules/**/routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
```

### JSDoc Annotation Pattern

```typescript
/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProduct'
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Duplicate product
 */
```

### Route Setup

```typescript
// src/app.ts
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (req, res) => res.json(swaggerSpec));
```

### Skills to Invoke

| Order | Command                                  | Purpose                     |
| ----- | ---------------------------------------- | --------------------------- |
| 1     | `/api-endpoint GET /api/docs`            | Setup Swagger UI route      |
| 2     | Add JSDoc annotations to all route files | Document all ~112 endpoints |

### Verification Gate

- [ ] `GET /api/docs` serves Swagger UI
- [ ] `GET /api/docs.json` returns valid OpenAPI JSON
- [ ] All ~112 endpoints documented
- [ ] Auth example with Bearer token works
- [ ] Request/response schemas match Zod schemas
- [ ] Grouped by module tags
- [ ] Error responses documented (400, 401, 403, 404, 409)
