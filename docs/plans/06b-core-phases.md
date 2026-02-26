# Core Phases — Powerloom ERP V3

> **Phases 3-7** — Batch System, Inventory & Raw Materials, Production, Damage Management, Post-Production
>
> Parent: [06-implementation-guide.md](./06-implementation-guide.md)

---

## Phase 3: Batch System

> **Dependencies:** Phase 1 | **Epic coverage:** DB Epic 3 + BE Epic 5 | **CL items:** CL-DB-08 (8.1-8.4), CL-BE-05 (5.1-5.5) | **Endpoints:** 3 | **Tests:** 2 integration

### Overview

The batch system provides optional end-to-end traceability from raw cone through to finished product and sale. It is controlled by a **per-tenant feature flag** (`tenant_settings.batch_enabled`). When enabled, all downstream operations (inventory, production, damage, tailoring, packaging, sales) can link to a batch ID. When disabled, all batch-related fields are hidden in the UI and batch_id is null in the database. Closed batches can be reopened, and products from closed batches can still be sold.

### DB Tables

#### `batches`

| Column         | Type                                  | Constraints                     | Notes                             |
| -------------- | ------------------------------------- | ------------------------------- | --------------------------------- |
| `id`           | `uuid`                                | PK, default `gen_random_uuid()` |                                   |
| `tenant_id`    | `uuid`                                | FK -> tenants, NOT NULL         | Multi-tenancy isolation           |
| `batch_number` | `varchar(50)`                         | NOT NULL                        | Auto-generated, unique per tenant |
| `product_id`   | `uuid`                                | FK -> products, NOT NULL        | Links batch to a specific product |
| `status`       | `enum('open','in_progress','closed')` | NOT NULL, default `'open'`      | Lifecycle state                   |
| `notes`        | `text`                                | NULLABLE                        | Optional description or notes     |
| `created_at`   | `timestamptz`                         | NOT NULL, default `now()`       |                                   |
| `updated_at`   | `timestamptz`                         | NOT NULL, default `now()`       |                                   |

**Indexes:**

- `idx_batches_tenant_id` on `(tenant_id)`
- `idx_batches_tenant_product` on `(tenant_id, product_id)`
- `idx_batches_tenant_status` on `(tenant_id, status)`
- UNIQUE constraint on `(tenant_id, batch_number)`

**RLS Policy:**

- `batch_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

### Skills to Invoke (ordered table)

| Order | Skill                          | Command                                                                    | Purpose                                        |
| ----- | ------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------- |
| 1     | DB Migration                   | `/db-migration batches`                                                    | Create batches table, RLS, indexes             |
| 2     | Scaffold Module                | `/scaffold-module batches`                                                 | Routes, Zod schema, service, repository, types |
| 3     | Generate Test                  | `/generate-test batches unit`                                              | Unit tests for batch service logic             |
| 4     | Generate Test                  | `/generate-test batches integration`                                       | Integration tests for batch API                |
| 5     | Generate Seed                  | `/generate-seed batches`                                                   | Realistic seed data (various statuses)         |
| 6     | Add Translation (batch labels) | `/add-translation batch.created "Batch created" "தொகுதி உருவாக்கப்பட்டது"` | i18n keys                                      |

### Agent Activation Flow

```
TM2 (Domain Advisor)
  → Clarify: When is batch_enabled toggled? What happens to existing batches if disabled?
  → Answer: Feature flag check on every batch API call. If disabled, return 403.
           Existing batches remain in DB but are inaccessible via API.

TM1 (DB Architect)
  → /db-migration batches
  → Validates: tenant_id column, RLS policy, unique(tenant_id, batch_number), status enum
  → db-reviewer agent auto-triggers on migration file

TM3 (Backend Builder)
  → /scaffold-module batches
  → Implements: feature flag middleware, batch CRUD, status transitions
  → business-logic-validator agent auto-triggers on service file

TM5 (QA Engineer)
  → /generate-test batches unit
  → /generate-test batches integration
  → Writes RED tests first, then verifies GREEN after implementation
  → test-runner agent auto-triggers after code changes

TM6 (Progress Tracker)
  → Validates CL-DB-08 (items 8.1-8.4) and CL-BE-05 (items 5.1-5.5) completion
```

### TDD Steps (RED/GREEN/REFACTOR)

#### RED Phase

Write failing tests for:

1. **Schema test** -- Verify `batches` table exists with all columns and correct types
2. **Feature flag test** -- When `batch_enabled = false`, all batch endpoints return 403
3. **Create batch test** -- POST /api/batches with valid data returns 201 + auto-generated batch_number
4. **Create batch without flag test** -- POST /api/batches when batch_enabled=false returns 403
5. **List batches test** -- GET /api/batches returns tenant-scoped results with pagination
6. **Update batch test** -- PUT /api/batches/:id updates notes and product_id
7. **Status lifecycle tests:**
   - open -> in_progress (valid)
   - in_progress -> closed (valid)
   - closed -> open (reopen -- valid)
   - open -> closed (invalid -- must go through in_progress)
   - in_progress -> open (invalid -- cannot go backwards except reopen from closed)
8. **Tenant isolation test** -- Tenant A cannot see or modify Tenant B's batches
9. **Validation tests:**
   - Missing product_id returns 400
   - Invalid status transition returns 400
   - Non-existent batch ID returns 404

```bash
pnpm test -- --run src/modules/batches/__tests__/batches.unit.test.ts
# Expected: ALL FAIL (no implementation yet)
```

#### GREEN Phase

1. Run `/db-migration batches` -- creates migration file
2. Run migration: `pnpm migrate`
3. Run `/scaffold-module batches` -- creates full module structure:
   - `src/modules/batches/batches.routes.ts`
   - `src/modules/batches/batches.schema.ts` (Zod)
   - `src/modules/batches/batches.service.ts`
   - `src/modules/batches/batches.repository.ts`
   - `src/modules/batches/batches.types.ts`
4. Implement feature flag middleware:
   ```typescript
   // Check tenant_settings.batch_enabled before any batch operation
   async function requireBatchEnabled(req, res, next) {
     const settings = await getTenantSettings(req.tenantId);
     if (!settings.batchEnabled) {
       throw new AppError(
         "BATCH_DISABLED",
         403,
         "Batch system is not enabled for this tenant",
       );
     }
     next();
   }
   ```
5. Implement batch_number auto-generation:
   ```typescript
   // Format: B-YYYYMMDD-NNN (e.g., B-20260215-001)
   async function generateBatchNumber(tenantId: string): Promise<string> {
     const today = format(new Date(), "yyyyMMdd");
     const count = await countTodayBatches(tenantId);
     return `B-${today}-${String(count + 1).padStart(3, "0")}`;
   }
   ```
6. Implement status lifecycle validation:
   ```typescript
   const VALID_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
     open: ["in_progress"],
     in_progress: ["closed"],
     closed: ["open"], // reopen capability
   };
   ```

```bash
pnpm test -- --run src/modules/batches/__tests__/batches.unit.test.ts
# Expected: ALL PASS
```

#### REFACTOR Phase

- Extract feature flag middleware to shared utility (reused by transfers, shifts)
- Ensure batch_number generation is atomic (handle concurrent requests)
- Add i18n keys: `batch.status.open`, `batch.status.in_progress`, `batch.status.closed`, `batch.feature_disabled`
- Verify snake_case in DB, camelCase in API responses

### Curl Commands (reference to 06e)

See [06e-curl-reference.md](./06e-curl-reference.md) for complete curl commands. Key endpoints:

| Method | Path                      | Purpose                        |
| ------ | ------------------------- | ------------------------------ |
| POST   | `/api/batches`            | Create a new batch             |
| GET    | `/api/batches`            | List batches (with pagination) |
| PUT    | `/api/batches/:id`        | Update batch details           |
| PUT    | `/api/batches/:id/status` | Transition batch status        |

### Integration Tests

#### IT-5.1: Batch Lifecycle

```
Scenario: Complete batch lifecycle from creation to close and reopen
  Given a tenant with batch_enabled = true
  When POST /api/batches { productId, notes }
  Then 201 with auto-generated batchNumber
  When PUT /api/batches/:id/status { status: "in_progress" }
  Then 200 with status = "in_progress"
  When PUT /api/batches/:id/status { status: "closed" }
  Then 200 with status = "closed"
  When PUT /api/batches/:id/status { status: "open" }
  Then 200 with status = "open" (reopened)
```

#### IT-5.2: Feature Flag Enforcement

```
Scenario: Batch endpoints blocked when feature is disabled
  Given a tenant with batch_enabled = false
  When POST /api/batches { productId, notes }
  Then 403 with error code "BATCH_DISABLED"
  When GET /api/batches
  Then 403 with error code "BATCH_DISABLED"
  When PUT /api/batches/:id/status { status: "in_progress" }
  Then 403 with error code "BATCH_DISABLED"
```

### Verification Gate

- [ ] All unit tests pass (schema, validation, service logic, tenant isolation)
- [ ] IT-5.1 (lifecycle) passes
- [ ] IT-5.2 (feature flag enforcement) passes
- [ ] Curl manual testing done (see 06e)
- [ ] `db-reviewer` approved migration
- [ ] `business-logic-validator` approved service logic
- [ ] `checklist-validator` confirmed: CL-DB-08.1, 08.2, 08.3, 08.4 + CL-BE-05.1, 05.2, 05.3, 05.4, 05.5
- [ ] i18n keys added for all batch-related strings
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint warnings (`pnpm lint`)

---

## Phase 4: Inventory & Raw Materials

> **Dependencies:** Phase 2, Phase 3 | **Epic coverage:** DB Epic 4 + BE Epic 6 | **CL items:** CL-DB-09 (9 items), CL-BE-06 (11 items) | **Endpoints:** 7 | **Tests:** 3 integration

### Overview

The inventory system is the backbone of the Powerloom ERP. It tracks all stock across a 6-stage pipeline (`raw_cone -> paavu -> woven -> tailored -> bundled -> sold`) using a **5-dimensional unique key**: `godown_id + product_id + color + stage + batch_id`. This phase covers cone purchases (raw material intake), inventory queries, stock summaries, movement audit trails, and inter-godown transfers. Every stock change creates an `inventory_movement` record for full traceability.

### DB Tables

#### `inventory`

| Column       | Type                                                           | Constraints                     | Notes                                       |
| ------------ | -------------------------------------------------------------- | ------------------------------- | ------------------------------------------- |
| `id`         | `uuid`                                                         | PK, default `gen_random_uuid()` |                                             |
| `tenant_id`  | `uuid`                                                         | FK -> tenants, NOT NULL         |                                             |
| `godown_id`  | `uuid`                                                         | FK -> godowns, NOT NULL         | Which warehouse                             |
| `product_id` | `uuid`                                                         | FK -> products, NOT NULL        | Which product                               |
| `color`      | `varchar(100)`                                                 | NOT NULL                        | Thread/fabric color                         |
| `stage`      | `enum('raw_cone','paavu','woven','tailored','bundled','sold')` | NOT NULL                        | Current pipeline stage                      |
| `batch_id`   | `uuid`                                                         | FK -> batches, NULLABLE         | Null when batch system disabled             |
| `quantity`   | `decimal(12,3)`                                                | NOT NULL, default `0`           | Pieces or count depending on stage          |
| `weight_kg`  | `decimal(12,3)`                                                | NULLABLE                        | Weight tracked at raw_cone and woven stages |
| `created_at` | `timestamptz`                                                  | NOT NULL, default `now()`       |                                             |
| `updated_at` | `timestamptz`                                                  | NOT NULL, default `now()`       |                                             |

**Indexes:**

- UNIQUE constraint on `(tenant_id, godown_id, product_id, color, stage, batch_id)` -- the 5-dimensional key (batch_id uses COALESCE for null handling)
- `idx_inventory_tenant_godown` on `(tenant_id, godown_id)`
- `idx_inventory_tenant_stage` on `(tenant_id, stage)`
- `idx_inventory_tenant_product` on `(tenant_id, product_id)`

**RLS Policy:**

- `inventory_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

#### `inventory_movements`

| Column             | Type                                                       | Constraints                     | Notes                                      |
| ------------------ | ---------------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| `id`               | `uuid`                                                     | PK, default `gen_random_uuid()` |                                            |
| `tenant_id`        | `uuid`                                                     | FK -> tenants, NOT NULL         |                                            |
| `inventory_id`     | `uuid`                                                     | FK -> inventory, NOT NULL       | Which inventory record was affected        |
| `movement_type`    | `enum('increase','decrease','transfer_in','transfer_out')` | NOT NULL                        | Direction of stock change                  |
| `quantity_change`  | `decimal(12,3)`                                            | NOT NULL                        | Absolute value of change                   |
| `weight_change_kg` | `decimal(12,3)`                                            | NULLABLE                        | Weight change if applicable                |
| `reference_type`   | `varchar(50)`                                              | NOT NULL                        | Source entity type (e.g., 'cone_purchase') |
| `reference_id`     | `uuid`                                                     | NOT NULL                        | Source entity ID                           |
| `notes`            | `text`                                                     | NULLABLE                        |                                            |
| `created_by`       | `uuid`                                                     | FK -> users, NOT NULL           | Who performed the action                   |
| `created_at`       | `timestamptz`                                              | NOT NULL, default `now()`       |                                            |

**Indexes:**

- `idx_movements_tenant_inventory` on `(tenant_id, inventory_id)`
- `idx_movements_tenant_reference` on `(tenant_id, reference_type, reference_id)`
- `idx_movements_created_at` on `(tenant_id, created_at)`

**RLS Policy:**

- `movement_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

#### `cone_purchases`

| Column           | Type            | Constraints                      | Notes                                             |
| ---------------- | --------------- | -------------------------------- | ------------------------------------------------- |
| `id`             | `uuid`          | PK, default `gen_random_uuid()`  |                                                   |
| `tenant_id`      | `uuid`          | FK -> tenants, NOT NULL          |                                                   |
| `supplier_id`    | `uuid`          | FK -> suppliers, NOT NULL        | Who supplied the cones                            |
| `godown_id`      | `uuid`          | FK -> godowns, NOT NULL          | Destination warehouse                             |
| `product_id`     | `uuid`          | FK -> products, NOT NULL         | Which product these cones are for                 |
| `color`          | `varchar(100)`  | NOT NULL                         | Thread color                                      |
| `batch_id`       | `uuid`          | FK -> batches, NULLABLE          | Null when batch disabled                          |
| `quantity_kg`    | `decimal(12,3)` | NOT NULL                         | Weight purchased                                  |
| `rate_per_kg`    | `decimal(10,2)` | NOT NULL                         | Unit price                                        |
| `total_cost`     | `decimal(12,2)` | NOT NULL                         | Auto-calculated: quantity_kg \* rate_per_kg       |
| `gst_rate_pct`   | `decimal(5,2)`  | NOT NULL, default `0.00`         | GST percentage                                    |
| `gst_amount`     | `decimal(12,2)` | NOT NULL, default `0.00`         | Auto-calculated: total_cost \* gst_rate_pct / 100 |
| `invoice_number` | `varchar(100)`  | NULLABLE                         | Supplier invoice reference                        |
| `purchase_date`  | `date`          | NOT NULL, default `CURRENT_DATE` | Date of purchase                                  |
| `notes`          | `text`          | NULLABLE                         |                                                   |
| `created_by`     | `uuid`          | FK -> users, NOT NULL            |                                                   |
| `created_at`     | `timestamptz`   | NOT NULL, default `now()`        |                                                   |
| `updated_at`     | `timestamptz`   | NOT NULL, default `now()`        |                                                   |

**Indexes:**

- `idx_cone_purchases_tenant` on `(tenant_id)`
- `idx_cone_purchases_tenant_supplier` on `(tenant_id, supplier_id)`
- `idx_cone_purchases_tenant_date` on `(tenant_id, purchase_date)`

**RLS Policy:**

- `cone_purchase_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

#### `inter_godown_transfers`

| Column             | Type                                                           | Constraints                     | Notes                 |
| ------------------ | -------------------------------------------------------------- | ------------------------------- | --------------------- |
| `id`               | `uuid`                                                         | PK, default `gen_random_uuid()` |                       |
| `tenant_id`        | `uuid`                                                         | FK -> tenants, NOT NULL         |                       |
| `source_godown_id` | `uuid`                                                         | FK -> godowns, NOT NULL         | Origin warehouse      |
| `dest_godown_id`   | `uuid`                                                         | FK -> godowns, NOT NULL         | Destination warehouse |
| `product_id`       | `uuid`                                                         | FK -> products, NOT NULL        |                       |
| `color`            | `varchar(100)`                                                 | NOT NULL                        |                       |
| `stage`            | `enum('raw_cone','paavu','woven','tailored','bundled','sold')` | NOT NULL                        |                       |
| `batch_id`         | `uuid`                                                         | FK -> batches, NULLABLE         |                       |
| `quantity`         | `decimal(12,3)`                                                | NOT NULL                        | Amount transferred    |
| `weight_kg`        | `decimal(12,3)`                                                | NULLABLE                        | Weight if applicable  |
| `notes`            | `text`                                                         | NULLABLE                        |                       |
| `transferred_by`   | `uuid`                                                         | FK -> users, NOT NULL           |                       |
| `created_at`       | `timestamptz`                                                  | NOT NULL, default `now()`       |                       |

**Constraints:**

- CHECK: `source_godown_id != dest_godown_id`

**Indexes:**

- `idx_transfers_tenant` on `(tenant_id)`
- `idx_transfers_tenant_source` on `(tenant_id, source_godown_id)`
- `idx_transfers_tenant_dest` on `(tenant_id, dest_godown_id)`

**RLS Policy:**

- `transfer_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

### Skills to Invoke (ordered table)

| Order | Skill           | Command                                                             | Purpose                                             |
| ----- | --------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| 1     | DB Migration    | `/db-migration inventory`                                           | Create inventory table with 5-dim unique constraint |
| 2     | DB Migration    | `/db-migration inventory_movements`                                 | Create movement audit trail table                   |
| 3     | DB Migration    | `/db-migration cone_purchases`                                      | Create cone purchases table                         |
| 4     | DB Migration    | `/db-migration inter_godown_transfers`                              | Create transfer table with CHECK constraint         |
| 5     | Scaffold Module | `/scaffold-module cone-purchases`                                   | Cone purchase CRUD + inventory integration          |
| 6     | Scaffold Module | `/scaffold-module inventory`                                        | Inventory queries + summary + movements             |
| 7     | Scaffold Module | `/scaffold-module transfers`                                        | Inter-godown transfer with feature flag             |
| 8     | Generate Test   | `/generate-test cone-purchases integration`                         | Integration tests for cone purchase flow            |
| 9     | Generate Test   | `/generate-test inventory integration`                              | Integration tests for inventory queries             |
| 10    | Generate Test   | `/generate-test transfers integration`                              | Integration tests for transfer atomicity            |
| 11    | Generate Seed   | `/generate-seed cone_purchases`                                     | Realistic cone purchase seed data                   |
| 12    | Generate Seed   | `/generate-seed inventory`                                          | Seed data across all 6 stages                       |
| 13    | Add Translation | `/add-translation inventory.stage.raw_cone "Raw Cone" "மூலப் பூளை"` | i18n for all 6 stages                               |

### Agent Activation Flow

```
TM2 (Domain Advisor)
  → Clarify: How does the 5-dimensional key work with null batch_id?
  → Answer: Use COALESCE(batch_id, '00000000-0000-0000-0000-000000000000')
            in the unique constraint to treat null batch as a single group.
  → Clarify: Can cone purchases span multiple products?
  → Answer: No. Each purchase is per product + color. Multiple lines = multiple records.

TM1 (DB Architect)
  → /db-migration inventory
  → /db-migration inventory_movements
  → /db-migration cone_purchases
  → /db-migration inter_godown_transfers
  → db-reviewer validates: 5-dim unique, FK integrity, RLS on all 4 tables

TM3 (Backend Builder)
  → /scaffold-module cone-purchases
  → /scaffold-module inventory
  → /scaffold-module transfers
  → Implements: auto-calc (total_cost, gst_amount), inventory increase on purchase,
    movement logging, transfer atomicity, feature flag for transfers
  → business-logic-validator checks: cone purchase -> inventory flow

TM5 (QA Engineer)
  → /generate-test cone-purchases integration
  → /generate-test inventory integration
  → /generate-test transfers integration
  → Tests cone->inventory pipeline, multi-purchase aggregation, transfer both sides

TM6 (Progress Tracker)
  → Validates CL-DB-09 (9 items) and CL-BE-06 (11 items) completion
```

### TDD Steps (RED/GREEN/REFACTOR)

#### RED Phase

Write failing tests for:

**Cone Purchase tests:**

1. POST /api/cone-purchases creates purchase record with auto-calculated total_cost
2. POST /api/cone-purchases creates purchase record with auto-calculated gst_amount
3. POST /api/cone-purchases increases inventory at raw_cone stage
4. POST /api/cone-purchases creates an inventory_movement record with reference_type='cone_purchase'
5. POST /api/cone-purchases with batch_id when batch_enabled=false returns 400
6. POST /api/cone-purchases with batch_id when batch_enabled=true succeeds
7. GET /api/cone-purchases returns paginated, tenant-scoped results

**Inventory tests:** 8. GET /api/inventory returns stock filtered by godown, product, color, stage 9. GET /api/inventory/summary returns aggregated totals by stage 10. GET /api/inventory/:id/movements returns movement history sorted by created_at desc

**Transfer tests:** 11. POST /api/transfers when inter_godown_transfer_enabled=false returns 403 12. POST /api/transfers with source_godown == dest_godown returns 400 13. POST /api/transfers decreases source inventory and increases dest inventory atomically 14. POST /api/transfers creates two movement records (transfer_out + transfer_in) 15. POST /api/transfers with insufficient stock returns 400

**Tenant isolation tests:** 16. Tenant A cannot see Tenant B's inventory, purchases, or transfers

```bash
pnpm test -- --run src/modules/cone-purchases/__tests__/cone-purchases.unit.test.ts
pnpm test -- --run src/modules/inventory/__tests__/inventory.unit.test.ts
pnpm test -- --run src/modules/transfers/__tests__/transfers.unit.test.ts
# Expected: ALL FAIL
```

#### GREEN Phase

1. Run migrations for all 4 tables (in order: inventory, inventory_movements, cone_purchases, inter_godown_transfers)
2. Scaffold all 3 modules
3. Implement cone purchase service:

   ```typescript
   async function createConePurchase(
     data: CreateConePurchaseDto,
   ): Promise<ConePurchase> {
     return withTransaction(async (tx) => {
       // 1. Auto-calculate
       const totalCost = data.quantityKg * data.ratePerKg;
       const gstAmount = totalCost * (data.gstRatePct / 100);

       // 2. Validate batch_id if provided
       if (data.batchId) {
         await requireBatchEnabled(data.tenantId);
         await validateBatchExists(data.batchId, data.tenantId);
       }

       // 3. Create purchase record
       const purchase = await conePurchaseRepo.create(tx, {
         ...data,
         totalCost,
         gstAmount,
       });

       // 4. Upsert inventory (increase raw_cone)
       await inventoryService.increase(tx, {
         tenantId: data.tenantId,
         godownId: data.godownId,
         productId: data.productId,
         color: data.color,
         stage: "raw_cone",
         batchId: data.batchId,
         quantity: data.quantityKg,
         weightKg: data.quantityKg,
       });

       // 5. Log movement
       await movementService.create(tx, {
         tenantId: data.tenantId,
         inventoryId: inventory.id,
         movementType: "increase",
         quantityChange: data.quantityKg,
         weightChangeKg: data.quantityKg,
         referenceType: "cone_purchase",
         referenceId: purchase.id,
         createdBy: data.createdBy,
       });

       return purchase;
     });
   }
   ```

4. Implement transfer service with atomicity:

   ```typescript
   async function createTransfer(data: CreateTransferDto): Promise<Transfer> {
     // Feature flag check
     await requireTransferEnabled(data.tenantId);

     // Validate src != dest (also enforced by DB CHECK constraint)
     if (data.sourceGodownId === data.destGodownId) {
       throw new AppError(
         "SAME_GODOWN",
         400,
         "Source and destination godowns must be different",
       );
     }

     return withTransaction(async (tx) => {
       // Decrease source (throws if insufficient)
       await inventoryService.decrease(tx, {
         ...data,
         godownId: data.sourceGodownId,
       });

       // Increase destination
       await inventoryService.increase(tx, {
         ...data,
         godownId: data.destGodownId,
       });

       // Log both movements
       // ... transfer_out + transfer_in
     });
   }
   ```

```bash
pnpm test -- --run src/modules/cone-purchases/__tests__/cone-purchases.unit.test.ts
pnpm test -- --run src/modules/inventory/__tests__/inventory.unit.test.ts
pnpm test -- --run src/modules/transfers/__tests__/transfers.unit.test.ts
# Expected: ALL PASS
```

#### REFACTOR Phase

- Extract `inventoryService.increase()` / `inventoryService.decrease()` as reusable atomic operations (used by production, tailoring, packaging, sales)
- Extract feature flag middleware pattern to shared utility
- Ensure 5-dimensional upsert handles null batch_id correctly (COALESCE approach)
- Add i18n keys: all 6 stage names, movement types, transfer labels
- Verify decimal precision consistency across all monetary calculations

### Curl Commands (reference to 06e)

See [06e-curl-reference.md](./06e-curl-reference.md) for complete curl commands. Key endpoints:

| Method | Path                           | Purpose                                  |
| ------ | ------------------------------ | ---------------------------------------- |
| POST   | `/api/cone-purchases`          | Record a cone purchase                   |
| GET    | `/api/cone-purchases`          | List cone purchases (paginated)          |
| GET    | `/api/inventory`               | Query inventory by dimensions            |
| GET    | `/api/inventory/summary`       | Aggregated stock summary by stage        |
| GET    | `/api/inventory/:id/movements` | Movement history for an inventory record |
| POST   | `/api/transfers`               | Create inter-godown transfer             |
| GET    | `/api/transfers`               | List transfers (paginated)               |

### Integration Tests

#### IT-6.1: Cone Purchase to Inventory Flow

```
Scenario: Cone purchase creates raw_cone inventory and movement
  Given a tenant with a godown "Main Godown", supplier "ABC Cones", product "Single Khadi"
  When POST /api/cone-purchases {
    supplierId, godownId, productId, color: "White",
    quantityKg: 120.5, ratePerKg: 85.00, gstRatePct: 5.00
  }
  Then 201 with:
    - totalCost = 10242.50 (120.5 * 85.00)
    - gstAmount = 512.13 (10242.50 * 5 / 100)
  And GET /api/inventory?godownId=X&productId=Y&color=White&stage=raw_cone
    → quantity = 120.5, weightKg = 120.5
  And GET /api/inventory/:id/movements
    → 1 record: movementType = "increase", quantityChange = 120.5, referenceType = "cone_purchase"
```

#### IT-6.2: Multi-Purchase Aggregation

```
Scenario: Multiple cone purchases aggregate in same inventory record
  Given existing inventory: White, raw_cone, quantity = 120.5
  When POST /api/cone-purchases { same godown/product/color, quantityKg: 60.0 }
  Then GET /api/inventory → quantity = 180.5 (120.5 + 60.0)
  And GET /api/inventory/:id/movements → 2 records
  And GET /api/inventory/summary → raw_cone total includes 180.5
```

#### IT-6.3: Inter-Godown Transfer (Both Sides)

```
Scenario: Transfer decreases source and increases destination atomically
  Given tenant with inter_godown_transfer_enabled = true
  And "Main Godown" has 100 pieces of "White, woven" inventory
  And "Branch Godown" has 0 pieces
  When POST /api/transfers {
    sourceGodownId: mainGodown, destGodownId: branchGodown,
    productId, color: "White", stage: "woven", quantity: 30
  }
  Then 201
  And GET /api/inventory?godownId=mainGodown → quantity = 70
  And GET /api/inventory?godownId=branchGodown → quantity = 30
  And movement records: transfer_out (main) + transfer_in (branch)

  Scenario: Transfer with insufficient stock fails atomically
  Given "Main Godown" has 70 pieces remaining
  When POST /api/transfers { quantity: 100 }
  Then 400 "Insufficient stock"
  And GET /api/inventory?godownId=mainGodown → quantity = 70 (unchanged)
  And GET /api/inventory?godownId=branchGodown → quantity = 30 (unchanged)
```

### Verification Gate

- [ ] All unit tests pass (schema, validation, service logic for all 3 modules)
- [ ] IT-6.1 (cone -> inventory) passes
- [ ] IT-6.2 (multi-purchase aggregation) passes
- [ ] IT-6.3 (transfer both sides + atomicity) passes
- [ ] Curl manual testing done (see 06e)
- [ ] `db-reviewer` approved all 4 migration files
- [ ] `business-logic-validator` approved auto-calc and inventory logic
- [ ] `checklist-validator` confirmed: CL-DB-09 (9 items) + CL-BE-06 (11 items)
- [ ] i18n keys added for all inventory and purchase strings
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint warnings (`pnpm lint`)

---

## Phase 5: Production System (MILESTONE)

> **Dependencies:** Phase 4 | **Epic coverage:** DB Epic 5 + BE Epic 7 | **CL items:** CL-DB-10 (11 items), CL-BE-07 (15 items) | **Endpoints:** 14 | **Tests:** 7 integration

> **MILESTONE PHASE** -- `devils-advocate` (TM7) review required before proceeding.

### Overview

The production system is the core of the Powerloom ERP and covers the full production lifecycle: issuing cones to wagers, recording paavu (warp) production, capturing production returns (finished pieces), tracking loom downtime, and managing work shifts. This phase implements critical business logic around **wager types** (1-4), each with different rules for weight vs. count-based returns, ownership models, and wage calculations. Color substitution detection triggers fraud alerts. This is a **milestone phase** and receives a full `devils-advocate` review.

### DB Tables

#### `cone_issuances`

| Column        | Type            | Constraints                     | Notes                          |
| ------------- | --------------- | ------------------------------- | ------------------------------ |
| `id`          | `uuid`          | PK, default `gen_random_uuid()` |                                |
| `tenant_id`   | `uuid`          | FK -> tenants, NOT NULL         |                                |
| `wager_id`    | `uuid`          | FK -> users, NOT NULL           | Which wager receives the cones |
| `godown_id`   | `uuid`          | FK -> godowns, NOT NULL         | Source godown                  |
| `product_id`  | `uuid`          | FK -> products, NOT NULL        |                                |
| `color`       | `varchar(100)`  | NOT NULL                        | Color of cones issued          |
| `batch_id`    | `uuid`          | FK -> batches, NULLABLE         |                                |
| `quantity_kg` | `decimal(12,3)` | NOT NULL                        | Weight of cones issued         |
| `issued_by`   | `uuid`          | FK -> users, NOT NULL           | Staff/owner who issued         |
| `issued_at`   | `timestamptz`   | NOT NULL, default `now()`       |                                |
| `notes`       | `text`          | NULLABLE                        |                                |
| `created_at`  | `timestamptz`   | NOT NULL, default `now()`       |                                |
| `updated_at`  | `timestamptz`   | NOT NULL, default `now()`       |                                |

**Indexes:**

- `idx_cone_issuances_tenant_wager` on `(tenant_id, wager_id)`
- `idx_cone_issuances_tenant_date` on `(tenant_id, issued_at)`

**RLS Policy:**

- `cone_issuance_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

#### `paavu_productions`

| Column            | Type            | Constraints                      | Notes                                |
| ----------------- | --------------- | -------------------------------- | ------------------------------------ |
| `id`              | `uuid`          | PK, default `gen_random_uuid()`  |                                      |
| `tenant_id`       | `uuid`          | FK -> tenants, NOT NULL          |                                      |
| `paavu_oati_id`   | `uuid`          | FK -> users, NOT NULL            | Paavu worker who prepared            |
| `godown_id`       | `uuid`          | FK -> godowns, NOT NULL          | Paavu Pattarai godown                |
| `product_id`      | `uuid`          | FK -> products, NOT NULL         |                                      |
| `color`           | `varchar(100)`  | NOT NULL                         |                                      |
| `batch_id`        | `uuid`          | FK -> batches, NULLABLE          |                                      |
| `cone_weight_kg`  | `decimal(12,3)` | NOT NULL                         | Weight of cones consumed             |
| `paavu_count`     | `integer`       | NOT NULL                         | Number of paavu produced             |
| `wastage_grams`   | `decimal(10,2)` | NOT NULL, default `0`            | Waste during paavu preparation       |
| `wastage_flagged` | `boolean`       | NOT NULL, default `false`        | Auto-set when wastage > tenant limit |
| `production_date` | `date`          | NOT NULL, default `CURRENT_DATE` |                                      |
| `notes`           | `text`          | NULLABLE                         |                                      |
| `created_by`      | `uuid`          | FK -> users, NOT NULL            |                                      |
| `created_at`      | `timestamptz`   | NOT NULL, default `now()`        |                                      |
| `updated_at`      | `timestamptz`   | NOT NULL, default `now()`        |                                      |

**Indexes:**

- `idx_paavu_productions_tenant_oati` on `(tenant_id, paavu_oati_id)`
- `idx_paavu_productions_tenant_date` on `(tenant_id, production_date)`

**RLS Policy:**

- `paavu_production_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

#### `production_returns`

| Column            | Type            | Constraints                      | Notes                                         |
| ----------------- | --------------- | -------------------------------- | --------------------------------------------- |
| `id`              | `uuid`          | PK, default `gen_random_uuid()`  |                                               |
| `tenant_id`       | `uuid`          | FK -> tenants, NOT NULL          |                                               |
| `wager_id`        | `uuid`          | FK -> users, NOT NULL            | Which wager returned the pieces               |
| `loom_id`         | `uuid`          | FK -> looms, NOT NULL            | Which loom produced the pieces                |
| `godown_id`       | `uuid`          | FK -> godowns, NOT NULL          | Destination godown                            |
| `product_id`      | `uuid`          | FK -> products, NOT NULL         |                                               |
| `color`           | `varchar(100)`  | NOT NULL                         | Expected color                                |
| `batch_id`        | `uuid`          | FK -> batches, NULLABLE          |                                               |
| `shift_id`        | `uuid`          | FK -> shifts, NULLABLE           | Null when shift tracking disabled             |
| `piece_count`     | `integer`       | NULLABLE                         | Mandatory for Type 2/4, optional for Type 1/3 |
| `weight_kg`       | `decimal(12,3)` | NULLABLE                         | Mandatory for Type 1/3, optional for Type 2/4 |
| `wastage_kg`      | `decimal(10,3)` | NOT NULL, default `0`            | Production waste                              |
| `wastage_flagged` | `boolean`       | NOT NULL, default `false`        | Auto-flagged when wastage exceeds threshold   |
| `return_date`     | `date`          | NOT NULL, default `CURRENT_DATE` |                                               |
| `notes`           | `text`          | NULLABLE                         |                                               |
| `created_by`      | `uuid`          | FK -> users, NOT NULL            |                                               |
| `created_at`      | `timestamptz`   | NOT NULL, default `now()`        |                                               |
| `updated_at`      | `timestamptz`   | NOT NULL, default `now()`        |                                               |

**Indexes:**

- `idx_production_returns_tenant_wager` on `(tenant_id, wager_id)`
- `idx_production_returns_tenant_date` on `(tenant_id, return_date)`
- `idx_production_returns_tenant_loom` on `(tenant_id, loom_id)`
- `idx_production_returns_tenant_product` on `(tenant_id, product_id)`

**RLS Policy:**

- `production_return_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

#### `loom_downtimes`

| Column             | Type                                                          | Constraints                     | Notes                                |
| ------------------ | ------------------------------------------------------------- | ------------------------------- | ------------------------------------ |
| `id`               | `uuid`                                                        | PK, default `gen_random_uuid()` |                                      |
| `tenant_id`        | `uuid`                                                        | FK -> tenants, NOT NULL         |                                      |
| `loom_id`          | `uuid`                                                        | FK -> looms, NOT NULL           | Which loom was down                  |
| `wager_id`         | `uuid`                                                        | FK -> users, NULLABLE           | Wager operating loom (if applicable) |
| `reason`           | `enum('mechanical','electrical','material_shortage','other')` | NOT NULL                        |                                      |
| `custom_reason`    | `varchar(255)`                                                | NULLABLE                        | Required when reason = 'other'       |
| `start_time`       | `timestamptz`                                                 | NOT NULL                        | When downtime started                |
| `end_time`         | `timestamptz`                                                 | NULLABLE                        | Null = still down                    |
| `duration_minutes` | `integer`                                                     | NULLABLE                        | Auto-calculated when end_time is set |
| `reported_by`      | `uuid`                                                        | FK -> users, NOT NULL           | Owner OR wager can report            |
| `notes`            | `text`                                                        | NULLABLE                        |                                      |
| `created_at`       | `timestamptz`                                                 | NOT NULL, default `now()`       |                                      |
| `updated_at`       | `timestamptz`                                                 | NOT NULL, default `now()`       |                                      |

**Indexes:**

- `idx_downtimes_tenant_loom` on `(tenant_id, loom_id)`
- `idx_downtimes_tenant_wager` on `(tenant_id, wager_id)`
- `idx_downtimes_tenant_dates` on `(tenant_id, start_time, end_time)`

**RLS Policy:**

- `downtime_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

#### `shifts`

| Column       | Type           | Constraints                     | Notes                                |
| ------------ | -------------- | ------------------------------- | ------------------------------------ |
| `id`         | `uuid`         | PK, default `gen_random_uuid()` |                                      |
| `tenant_id`  | `uuid`         | FK -> tenants, NOT NULL         |                                      |
| `name`       | `varchar(100)` | NOT NULL                        | e.g., "Morning Shift", "Night Shift" |
| `start_time` | `time`         | NOT NULL                        | Shift start (e.g., 06:00)            |
| `end_time`   | `time`         | NOT NULL                        | Shift end (e.g., 14:00)              |
| `is_active`  | `boolean`      | NOT NULL, default `true`        |                                      |
| `created_at` | `timestamptz`  | NOT NULL, default `now()`       |                                      |
| `updated_at` | `timestamptz`  | NOT NULL, default `now()`       |                                      |

**Indexes:**

- `idx_shifts_tenant` on `(tenant_id)`
- UNIQUE constraint on `(tenant_id, name)`

**RLS Policy:**

- `shift_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

### Skills to Invoke (ordered table)

| Order | Skill           | Command                                                                        | Purpose                                           |
| ----- | --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| 1     | DB Migration    | `/db-migration cone_issuances`                                                 | Create cone issuances table                       |
| 2     | DB Migration    | `/db-migration paavu_productions`                                              | Create paavu productions table                    |
| 3     | DB Migration    | `/db-migration production_returns`                                             | Create production returns table                   |
| 4     | DB Migration    | `/db-migration loom_downtimes`                                                 | Create loom downtimes table                       |
| 5     | DB Migration    | `/db-migration shifts`                                                         | Create shifts table (conditional on feature flag) |
| 6     | Scaffold Module | `/scaffold-module cone-issuances`                                              | Cone issuance CRUD + stock check                  |
| 7     | Scaffold Module | `/scaffold-module paavu-productions`                                           | Paavu recording + wastage flagging                |
| 8     | Scaffold Module | `/scaffold-module production-returns`                                          | Return recording + type-based validation          |
| 9     | Scaffold Module | `/scaffold-module loom-downtimes`                                              | Downtime CRUD + duration calc                     |
| 10    | Scaffold Module | `/scaffold-module shifts`                                                      | Shift CRUD + feature flag                         |
| 11    | API Endpoint    | `/api-endpoint GET /api/wagers/:id/performance`                                | Performance calculation endpoint                  |
| 12    | API Endpoint    | `/api-endpoint GET /api/wagers/ranking`                                        | Wager ranking with visibility control             |
| 13    | Generate Test   | `/generate-test cone-issuances integration`                                    | Issuance + stock check tests                      |
| 14    | Generate Test   | `/generate-test paavu-productions integration`                                 | Paavu + wastage tests                             |
| 15    | Generate Test   | `/generate-test production-returns integration`                                | Return + wager type tests                         |
| 16    | Generate Test   | `/generate-test loom-downtimes integration`                                    | Downtime CRUD tests                               |
| 17    | Generate Test   | `/generate-test shifts integration`                                            | Shift feature flag tests                          |
| 18    | Generate Seed   | `/generate-seed production_returns`                                            | Realistic production data across wager types      |
| 19    | Add Translation | `/add-translation production.cone_issued "Cone Issued" "கூம்பு வழங்கப்பட்டது"` | i18n keys                                         |

### Agent Activation Flow

```
TM2 (Domain Advisor)
  → Clarify: Wager Type 1/3 vs 2/4 return rules
  → Answer: Type 1/3 (Paavu + Oodai) → weight_kg mandatory, piece_count optional
            Type 2/4 (Oodai only) → piece_count mandatory, weight_kg optional
  → Clarify: When does wastage_flagged trigger?
  → Answer: When wastage_kg > tenant_settings.paavu_wastage_limit_grams (converted to kg)
  → Clarify: How does color substitution fraud detection work?
  → Answer: If return color != issued color for same batch/wager, create fraud alert

TM1 (DB Architect)
  → /db-migration cone_issuances
  → /db-migration paavu_productions
  → /db-migration production_returns
  → /db-migration loom_downtimes
  → /db-migration shifts
  → db-reviewer validates: all 5 tables have tenant_id, RLS, correct FKs

TM3 (Backend Builder)
  → /scaffold-module cone-issuances
  → /scaffold-module paavu-productions
  → /scaffold-module production-returns
  → /scaffold-module loom-downtimes
  → /scaffold-module shifts
  → /api-endpoint GET /api/wagers/:id/performance
  → /api-endpoint GET /api/wagers/ranking
  → Implements all business logic (wager type validation, wastage flagging,
    color substitution detection, performance calculation, ranking)
  → business-logic-validator checks all service files

TM5 (QA Engineer)
  → Writes tests for all 14 endpoints
  → Cross-module tests: cone issuance -> inventory decrease, production return -> inventory increase
  → test-runner agent validates all pass

TM6 (Progress Tracker)
  → Validates CL-DB-10 (11 items) and CL-BE-07 (15 items) completion

TM7 (Challenger) — MILESTONE REVIEW
  → devils-advocate reviews entire production system
  → Stress-tests: concurrent issuances, edge cases in wager types,
    performance calculation with zero downtime, ranking with no data
```

### TDD Steps (RED/GREEN/REFACTOR)

#### RED Phase

Write failing tests for:

**Cone Issuance tests:**

1. POST /api/cone-issuances with sufficient stock succeeds, decreases raw_cone inventory
2. POST /api/cone-issuances with insufficient stock returns 400 "INSUFFICIENT_STOCK"
3. POST /api/cone-issuances creates inventory_movement (decrease) record
4. GET /api/cone-issuances returns paginated, tenant-scoped results

**Paavu Production tests:** 5. POST /api/paavu-productions records paavu with all fields 6. POST /api/paavu-productions auto-flags wastage when > tenant limit 7. POST /api/paavu-productions does NOT flag wastage when <= tenant limit 8. GET /api/paavu-productions returns paginated results

**Production Return tests:** 9. POST /api/production-returns for Type 1 wager without weight_kg returns 400 10. POST /api/production-returns for Type 2 wager without piece_count returns 400 11. POST /api/production-returns for Type 1 wager with weight_kg succeeds 12. POST /api/production-returns for Type 2 wager with piece_count succeeds 13. POST /api/production-returns increases woven stage inventory 14. POST /api/production-returns with shift_id when shift_enabled=false returns 400 15. POST /api/production-returns with shift_id when shift_enabled=true succeeds 16. POST /api/production-returns validates wastage does not exceed returned weight/count 17. POST /api/production-returns with different color than issued cone triggers fraud alert 18. GET /api/production-returns returns paginated results

**Loom Downtime tests:** 19. POST /api/loom-downtimes by owner succeeds 20. POST /api/loom-downtimes by wager (assigned to loom) succeeds 21. POST /api/loom-downtimes with reason='other' and no custom_reason returns 400 22. PUT /api/loom-downtimes/:id with end_time auto-calculates duration_minutes 23. GET /api/loom-downtimes returns paginated results filtered by loom/wager

**Shift tests:** 24. POST /api/shifts when shift_enabled=false returns 403 25. POST /api/shifts when shift_enabled=true creates shift 26. PUT /api/shifts/:id updates shift 27. GET /api/shifts returns tenant-scoped active shifts

**Performance tests:** 28. GET /api/wagers/:id/performance returns utilization % 29. GET /api/wagers/ranking returns sorted rankings when show_wager_ranking=true 30. GET /api/wagers/ranking returns 403 when show_wager_ranking=false

```bash
pnpm test -- --run src/modules/cone-issuances/__tests__/
pnpm test -- --run src/modules/paavu-productions/__tests__/
pnpm test -- --run src/modules/production-returns/__tests__/
pnpm test -- --run src/modules/loom-downtimes/__tests__/
pnpm test -- --run src/modules/shifts/__tests__/
# Expected: ALL FAIL
```

#### GREEN Phase

1. Run all 5 migrations
2. Scaffold all 5 modules + 2 individual endpoints
3. Implement cone issuance with stock check:

   ```typescript
   async function createConeIssuance(data: CreateConeIssuanceDto) {
     return withTransaction(async (tx) => {
       // Check raw_cone stock
       const stock = await inventoryService.getStock(tx, {
         tenantId: data.tenantId,
         godownId: data.godownId,
         productId: data.productId,
         color: data.color,
         stage: "raw_cone",
         batchId: data.batchId,
       });

       if (!stock || stock.quantity < data.quantityKg) {
         throw new AppError(
           "INSUFFICIENT_STOCK",
           400,
           `Insufficient raw cone stock. Available: ${stock?.quantity ?? 0} kg`,
         );
       }

       // Decrease raw_cone inventory
       await inventoryService.decrease(tx, {
         ...dimensions,
         quantity: data.quantityKg,
       });

       // Create issuance record
       return coneIssuanceRepo.create(tx, data);
     });
   }
   ```

4. Implement wager-type-based return validation:
   ```typescript
   function validateReturn(wagerType: 1 | 2 | 3 | 4, data: CreateReturnDto) {
     // Type 1/3: Paavu + Oodai → weight mandatory
     if ([1, 3].includes(wagerType) && !data.weightKg) {
       throw new AppError(
         "WEIGHT_REQUIRED",
         400,
         "Weight is mandatory for Type 1/3 wagers (Paavu + Oodai)",
       );
     }
     // Type 2/4: Oodai only → count mandatory
     if ([2, 4].includes(wagerType) && !data.pieceCount) {
       throw new AppError(
         "COUNT_REQUIRED",
         400,
         "Piece count is mandatory for Type 2/4 wagers (Oodai only)",
       );
     }
   }
   ```
5. Implement wastage flagging:
   ```typescript
   async function checkWastageFlag(
     tenantId: string,
     wastageGrams: number,
   ): Promise<boolean> {
     const settings = await getTenantSettings(tenantId);
     return wastageGrams > settings.paavuWastageLimitGrams;
   }
   ```
6. Implement color substitution detection:
   ```typescript
   async function detectColorSubstitution(data: CreateReturnDto) {
     // Find issued color for this wager + product + batch
     const issuedColor = await getIssuedColor(data);
     if (issuedColor && issuedColor !== data.color) {
       await fraudAlertService.create({
         tenantId: data.tenantId,
         alertType: "color_substitution",
         severity: "high",
         details: {
           issuedColor,
           returnedColor: data.color,
           wagerId: data.wagerId,
         },
       });
     }
   }
   ```
7. Implement performance calculation:
   ```typescript
   // utilization % = actual / (capacity * (working_days - downtime_days)) * 100
   async function calculatePerformance(wagerId: string, dateRange: DateRange) {
     const actual = await getActualProduction(wagerId, dateRange);
     const loom = await getWagerLoom(wagerId);
     const capacity = loom.loomType.capacityPerDay;
     const workingDays = getWorkingDays(dateRange);
     const downtimeDays = await getDowntimeDays(wagerId, dateRange);
     const expectedCapacity = capacity * (workingDays - downtimeDays);
     const utilization =
       expectedCapacity > 0 ? (actual / expectedCapacity) * 100 : 0;
     return { actual, expectedCapacity, utilization, downtimeDays };
   }
   ```
8. Implement ranking:
   ```typescript
   async function getWagerRanking(tenantId: string) {
     const settings = await getTenantSettings(tenantId);
     if (!settings.showWagerRanking) {
       throw new AppError("RANKING_DISABLED", 403, "Wager ranking is disabled");
     }
     const rankings = await calculateAllWagerPerformance(tenantId);
     return rankings.sort((a, b) => b.utilization - a.utilization);
   }
   ```

```bash
pnpm test -- --run src/modules/cone-issuances/__tests__/
pnpm test -- --run src/modules/paavu-productions/__tests__/
pnpm test -- --run src/modules/production-returns/__tests__/
pnpm test -- --run src/modules/loom-downtimes/__tests__/
pnpm test -- --run src/modules/shifts/__tests__/
# Expected: ALL PASS
```

#### REFACTOR Phase

- Extract wager type validation to shared utility (reused in wage calculation)
- Extract feature flag middleware (shift_enabled) to shared pattern
- Ensure fraud alert creation does not block the main production return flow (fire and forget or background)
- Performance calculation: cache loom capacity lookups
- Add i18n keys: all production-related strings, downtime reasons, wager type labels
- Review and optimize queries: ensure indexes cover common query patterns

### Curl Commands (reference to 06e)

See [06e-curl-reference.md](./06e-curl-reference.md) for complete curl commands. Key endpoints:

| Method | Path                          | Purpose                                   |
| ------ | ----------------------------- | ----------------------------------------- |
| POST   | `/api/cone-issuances`         | Issue cones to a wager                    |
| GET    | `/api/cone-issuances`         | List cone issuances                       |
| POST   | `/api/paavu-productions`      | Record paavu production                   |
| GET    | `/api/paavu-productions`      | List paavu productions                    |
| POST   | `/api/production-returns`     | Record production return (woven pieces)   |
| GET    | `/api/production-returns`     | List production returns                   |
| POST   | `/api/loom-downtimes`         | Report loom downtime                      |
| GET    | `/api/loom-downtimes`         | List loom downtimes                       |
| PUT    | `/api/loom-downtimes/:id`     | Update downtime (set end_time)            |
| POST   | `/api/shifts`                 | Create a shift                            |
| GET    | `/api/shifts`                 | List shifts                               |
| PUT    | `/api/shifts/:id`             | Update a shift                            |
| GET    | `/api/wagers/:id/performance` | Get wager performance/utilization         |
| GET    | `/api/wagers/ranking`         | Get wager ranking (visibility controlled) |

### Integration Tests

#### IT-7.1: Cone Issuance with Stock Check

```
Scenario: Cone issuance decreases raw_cone inventory
  Given raw_cone inventory = 120.5 kg (White, Main Godown)
  When POST /api/cone-issuances { wagerId, quantityKg: 50.0 }
  Then 201
  And raw_cone inventory = 70.5 kg
  And inventory_movement: decrease, 50.0 kg, reference_type='cone_issuance'

Scenario: Cone issuance with insufficient stock
  Given raw_cone inventory = 70.5 kg
  When POST /api/cone-issuances { wagerId, quantityKg: 100.0 }
  Then 400 "INSUFFICIENT_STOCK"
  And raw_cone inventory = 70.5 kg (unchanged)
```

#### IT-7.2: Paavu Production with Wastage Flagging

```
Scenario: Paavu production within wastage limit
  Given tenant with paavu_wastage_limit_grams = 500
  When POST /api/paavu-productions { wastageGrams: 300 }
  Then 201 with wastageFlagged = false

Scenario: Paavu production exceeding wastage limit
  When POST /api/paavu-productions { wastageGrams: 750 }
  Then 201 with wastageFlagged = true
```

#### IT-7.3: Production Return (Type 1/3 Weight-Based)

```
Scenario: Type 1 wager returns with weight
  Given a wager with wagerType = 1
  When POST /api/production-returns { weightKg: 25.5, pieceCount: null }
  Then 201
  And woven inventory increases by quantity derived from weight

Scenario: Type 1 wager returns without weight
  When POST /api/production-returns { weightKg: null, pieceCount: 100 }
  Then 400 "WEIGHT_REQUIRED"
```

#### IT-7.4: Production Return (Type 2/4 Count-Based)

```
Scenario: Type 2 wager returns with count
  Given a wager with wagerType = 2
  When POST /api/production-returns { pieceCount: 100, weightKg: null }
  Then 201
  And woven inventory increases by 100 pieces

Scenario: Type 2 wager returns without count
  When POST /api/production-returns { pieceCount: null, weightKg: 25.5 }
  Then 400 "COUNT_REQUIRED"
```

#### IT-7.5: Color Substitution Fraud Detection

```
Scenario: Color mismatch triggers fraud alert
  Given cone issuance to wager for color "White"
  When POST /api/production-returns { color: "Blue", wagerId: same_wager }
  Then 201 (return is still recorded)
  And GET /api/fraud-alerts → includes alert with type "color_substitution"
    and details containing { issuedColor: "White", returnedColor: "Blue" }
```

#### IT-7.6: Loom Downtime with Duration Calculation

```
Scenario: Create and close downtime
  When POST /api/loom-downtimes { loomId, reason: "mechanical", startTime: "2026-02-15T08:00:00Z" }
  Then 201 with endTime = null, durationMinutes = null
  When PUT /api/loom-downtimes/:id { endTime: "2026-02-15T10:30:00Z" }
  Then 200 with durationMinutes = 150

Scenario: Downtime with reason 'other' requires custom_reason
  When POST /api/loom-downtimes { reason: "other", customReason: null }
  Then 400 "CUSTOM_REASON_REQUIRED"
```

#### IT-7.7: Shift Feature Flag and Performance

```
Scenario: Shifts blocked when disabled
  Given tenant with shift_enabled = false
  When POST /api/shifts { name: "Morning", startTime: "06:00", endTime: "14:00" }
  Then 403 "SHIFT_DISABLED"

Scenario: Performance calculation
  Given a wager with:
    - loom capacity: 50 pieces/day
    - date range: 7 days
    - actual production: 280 pieces
    - downtime: 1 day
  When GET /api/wagers/:id/performance?from=2026-02-08&to=2026-02-14
  Then 200 with:
    - actual = 280
    - expectedCapacity = 300 (50 * (7 - 1))
    - utilization = 93.33%

Scenario: Ranking visibility control
  Given tenant with show_wager_ranking = false
  When GET /api/wagers/ranking
  Then 403 "RANKING_DISABLED"
```

### Verification Gate

- [ ] All unit tests pass across all 5 modules + 2 endpoints
- [ ] IT-7.1 (cone issuance + stock check) passes
- [ ] IT-7.2 (paavu wastage flagging) passes
- [ ] IT-7.3 (Type 1/3 weight-based returns) passes
- [ ] IT-7.4 (Type 2/4 count-based returns) passes
- [ ] IT-7.5 (color substitution fraud detection) passes
- [ ] IT-7.6 (loom downtime with duration) passes
- [ ] IT-7.7 (shift feature flag + performance + ranking) passes
- [ ] Curl manual testing done (see 06e)
- [ ] `db-reviewer` approved all 5 migration files
- [ ] `business-logic-validator` approved wager type logic, wastage flagging, performance calc
- [ ] `checklist-validator` confirmed: CL-DB-10 (11 items) + CL-BE-07 (15 items)
- [ ] **`devils-advocate` MILESTONE review completed** -- stress-tested edge cases
- [ ] i18n keys added for all production strings
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint warnings (`pnpm lint`)

---

## Phase 6: Damage Management

> **Dependencies:** Phase 5 | **Epic coverage:** DB Epic 6 + BE Epic 8 | **CL items:** CL-DB-11 (7 items), CL-BE-08 (9 items) | **Endpoints:** 6 | **Tests:** 4 integration

### Overview

Damage management tracks defective pieces discovered at any of 4 detection points in the production pipeline. Each damage record is graded (minor/major/reject), with deduction rates snapshotted from tenant settings at the time of recording. No deductions are applied to a wager's wage until the **owner explicitly approves** the damage record. Miscellaneous damage (where the responsible wager cannot be identified) is absorbed by the owner. Wagers can only see their own damage records.

### DB Tables

#### `damage_records`

| Column                      | Type                                            | Constraints                        | Notes                                           |
| --------------------------- | ----------------------------------------------- | ---------------------------------- | ----------------------------------------------- |
| `id`                        | `uuid`                                          | PK, default `gen_random_uuid()`    |                                                 |
| `tenant_id`                 | `uuid`                                          | FK -> tenants, NOT NULL            |                                                 |
| `production_return_id`      | `uuid`                                          | FK -> production_returns, NULLABLE | Links to source return (null for miscellaneous) |
| `wager_id`                  | `uuid`                                          | FK -> users, NULLABLE              | Null for miscellaneous damage                   |
| `product_id`                | `uuid`                                          | FK -> products, NOT NULL           |                                                 |
| `detection_point`           | `enum('loom','tailoring','packaging','godown')` | NOT NULL                           | Where damage was discovered                     |
| `grade`                     | `enum('minor','major','reject')`                | NOT NULL                           | Severity of damage                              |
| `damage_count`              | `integer`                                       | NOT NULL                           | Number of damaged pieces                        |
| `deduction_rate_pct`        | `decimal(5,2)`                                  | NOT NULL                           | Snapshot from tenant_settings at creation time  |
| `production_cost_per_piece` | `decimal(10,2)`                                 | NOT NULL                           | Cost basis for deduction calculation            |
| `total_deduction`           | `decimal(12,2)`                                 | NOT NULL                           | Auto-calc: count _ cost _ rate% / 100           |
| `approval_status`           | `enum('pending','approved','rejected')`         | NOT NULL, default `'pending'`      | Owner must approve before wage deduction        |
| `approved_by`               | `uuid`                                          | FK -> users, NULLABLE              | Who approved/rejected                           |
| `approved_at`               | `timestamptz`                                   | NULLABLE                           | When approved/rejected                          |
| `is_miscellaneous`          | `boolean`                                       | NOT NULL, default `false`          | True = no wager link, owner absorbs             |
| `notes`                     | `text`                                          | NULLABLE                           |                                                 |
| `created_at`                | `timestamptz`                                   | NOT NULL, default `now()`          |                                                 |
| `updated_at`                | `timestamptz`                                   | NOT NULL, default `now()`          |                                                 |

**Indexes:**

- `idx_damage_records_tenant_wager` on `(tenant_id, wager_id)`
- `idx_damage_records_tenant_status` on `(tenant_id, approval_status)`
- `idx_damage_records_tenant_detection` on `(tenant_id, detection_point)`
- `idx_damage_records_tenant_product` on `(tenant_id, product_id)`
- `idx_damage_records_tenant_return` on `(tenant_id, production_return_id)`

**RLS Policy:**

- `damage_record_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

### Skills to Invoke (ordered table)

| Order | Skill           | Command                                               | Purpose                                                  |
| ----- | --------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| 1     | DB Migration    | `/db-migration damage_records`                        | Create damage_records table, RLS, indexes                |
| 2     | Scaffold Module | `/scaffold-module damage-records`                     | Full module: routes, schema, service, repository         |
| 3     | API Endpoint    | `/api-endpoint PUT /api/damage-records/:id/approve`   | Owner approval endpoint                                  |
| 4     | API Endpoint    | `/api-endpoint PUT /api/damage-records/:id/reject`    | Owner rejection endpoint                                 |
| 5     | Generate Test   | `/generate-test damage-records unit`                  | Unit tests for deduction calc, grade validation          |
| 6     | Generate Test   | `/generate-test damage-records integration`           | Integration tests for full approval workflow             |
| 7     | Generate Seed   | `/generate-seed damage_records`                       | Realistic damage data across grades and detection points |
| 8     | Add Translation | `/add-translation damage.grade.minor "Minor" "சிறிய"` | i18n keys for grades and detection points                |

### Agent Activation Flow

```
TM2 (Domain Advisor)
  → Clarify: What is production_cost_per_piece?
  → Answer: The cost to produce one piece (material + labor). Configurable per product.
  → Clarify: Can damage be recorded long after production?
  → Answer: Yes. Damage is traceable to the original wager indefinitely.
            The production_return_id links it back to the source.

TM1 (DB Architect)
  → /db-migration damage_records
  → db-reviewer validates: tenant_id, RLS, nullable wager_id for miscellaneous,
    approval_status enum, deduction_rate_pct snapshot

TM3 (Backend Builder)
  → /scaffold-module damage-records
  → /api-endpoint PUT /api/damage-records/:id/approve
  → /api-endpoint PUT /api/damage-records/:id/reject
  → Implements: deduction calculation, rate snapshot, owner-only approval,
    miscellaneous handling, wager visibility restriction
  → business-logic-validator checks: deduction formula, approval workflow

TM5 (QA Engineer)
  → /generate-test damage-records unit
  → /generate-test damage-records integration
  → Tests all grades, detection points, approval workflow, miscellaneous path

TM6 (Progress Tracker)
  → Validates CL-DB-11 (7 items) and CL-BE-08 (9 items) completion
```

### TDD Steps (RED/GREEN/REFACTOR)

#### RED Phase

Write failing tests for:

**Creation tests:**

1. POST /api/damage-records with valid data creates record with auto-calculated total_deduction
2. POST /api/damage-records snapshots deduction_rate_pct from tenant_settings based on grade
3. POST /api/damage-records for grade "minor" uses damage_minor_deduction_pct from settings
4. POST /api/damage-records for grade "major" uses damage_major_deduction_pct from settings
5. POST /api/damage-records for grade "reject" uses damage_reject_deduction_pct from settings
6. POST /api/damage-records validates detection_point is one of 4 values
7. POST /api/damage-records with is_miscellaneous=true does NOT require wager_id
8. POST /api/damage-records with is_miscellaneous=false REQUIRES wager_id
9. Total deduction = damage*count * production*cost_per_piece * deduction_rate_pct / 100
10. New damage records have approval_status = 'pending'

**Approval tests:** 11. PUT /api/damage-records/:id/approve by owner sets status to 'approved', records approved_by and approved_at 12. PUT /api/damage-records/:id/approve by non-owner returns 403 13. PUT /api/damage-records/:id/reject by owner sets status to 'rejected' 14. PUT /api/damage-records/:id/approve on already approved record returns 400 15. PUT /api/damage-records/:id/reject on already rejected record returns 400

**Query tests:** 16. GET /api/damage-records returns paginated, tenant-scoped results 17. GET /api/damage-records filtered by wager_id, detection_point, grade, approval_status 18. GET /api/damage-records/:id returns single record with all details 19. Wager role user can only see their own damage records 20. Owner/staff can see all damage records

```bash
pnpm test -- --run src/modules/damage-records/__tests__/damage-records.unit.test.ts
# Expected: ALL FAIL
```

#### GREEN Phase

1. Run `/db-migration damage_records`
2. Scaffold module: `/scaffold-module damage-records`
3. Implement deduction calculation with rate snapshot:

   ```typescript
   async function createDamageRecord(data: CreateDamageRecordDto) {
     // Get deduction rate from tenant settings based on grade
     const settings = await getTenantSettings(data.tenantId);
     const deductionRatePct = getDeductionRate(settings, data.grade);

     // Calculate total deduction
     const totalDeduction =
       data.damageCount *
       data.productionCostPerPiece *
       (deductionRatePct / 100);

     return damageRecordRepo.create({
       ...data,
       deductionRatePct, // Snapshot at creation
       totalDeduction, // Auto-calculated
       approvalStatus: "pending",
     });
   }

   function getDeductionRate(
     settings: TenantSettings,
     grade: DamageGrade,
   ): number {
     switch (grade) {
       case "minor":
         return settings.damageMinorDeductionPct;
       case "major":
         return settings.damageMajorDeductionPct;
       case "reject":
         return settings.damageRejectDeductionPct;
     }
   }
   ```

4. Implement owner-only approval:
   ```typescript
   async function approveDamage(id: string, userId: string, tenantId: string) {
     const record = await damageRecordRepo.findById(id, tenantId);
     if (!record) throw new AppError("NOT_FOUND", 404);
     if (record.approvalStatus !== "pending") {
       throw new AppError(
         "ALREADY_PROCESSED",
         400,
         `Damage record already ${record.approvalStatus}`,
       );
     }
     // Role check: only owner/admin
     return damageRecordRepo.update(id, {
       approvalStatus: "approved",
       approvedBy: userId,
       approvedAt: new Date(),
     });
   }
   ```
5. Implement wager visibility restriction:
   ```typescript
   // In the repository query, if role is 'wager', add WHERE wager_id = userId
   async function findAll(
     tenantId: string,
     filters: DamageFilters,
     userRole: string,
     userId: string,
   ) {
     let query = baseQuery.where("tenant_id", tenantId);
     if (userRole === "wager") {
       query = query.where("wager_id", userId);
     }
     // Apply other filters...
     return query;
   }
   ```

```bash
pnpm test -- --run src/modules/damage-records/__tests__/damage-records.unit.test.ts
# Expected: ALL PASS
```

#### REFACTOR Phase

- Extract role-based visibility pattern (used again for tailoring, packaging in Phase 7)
- Extract approval workflow pattern (approve/reject with status check) for reuse
- Verify deduction_rate_pct is snapshotted (not re-fetched) -- changing tenant settings after creation should NOT affect existing records
- Add i18n keys: grades, detection points, approval statuses, error messages
- Confirm damage_records.wager_id allows indefinite traceability (no cascade delete)

### Curl Commands (reference to 06e)

See [06e-curl-reference.md](./06e-curl-reference.md) for complete curl commands. Key endpoints:

| Method | Path                              | Purpose                        |
| ------ | --------------------------------- | ------------------------------ |
| POST   | `/api/damage-records`             | Create a damage record         |
| GET    | `/api/damage-records`             | List damage records (filtered) |
| GET    | `/api/damage-records/:id`         | Get single damage record       |
| PUT    | `/api/damage-records/:id/approve` | Owner approves damage          |
| PUT    | `/api/damage-records/:id/reject`  | Owner rejects damage           |

### Integration Tests

#### IT-8.1: Damage Recording with Auto-Deduction Calculation

```
Scenario: Create damage record with correct deduction
  Given tenant settings: damage_minor_deduction_pct = 25.00
  And production_cost_per_piece = 40.00
  When POST /api/damage-records {
    wagerId, productId, detectionPoint: "loom", grade: "minor",
    damageCount: 5, productionCostPerPiece: 40.00
  }
  Then 201 with:
    - deductionRatePct = 25.00 (snapshot)
    - totalDeduction = 50.00 (5 * 40 * 25 / 100)
    - approvalStatus = "pending"

Scenario: Deduction rate snapshot does not change with settings
  When tenant updates damage_minor_deduction_pct to 30.00
  And GET /api/damage-records/:id
  Then deductionRatePct = 25.00 (original snapshot preserved)
```

#### IT-8.2: Owner Approval Workflow

```
Scenario: Owner approves pending damage
  Given a damage record with approvalStatus = "pending"
  When PUT /api/damage-records/:id/approve (as owner)
  Then 200 with approvalStatus = "approved", approvedBy = ownerId, approvedAt = now

Scenario: Non-owner cannot approve
  Given a damage record with approvalStatus = "pending"
  When PUT /api/damage-records/:id/approve (as staff without permission)
  Then 403

Scenario: Cannot approve already approved record
  Given a damage record with approvalStatus = "approved"
  When PUT /api/damage-records/:id/approve
  Then 400 "ALREADY_PROCESSED"
```

#### IT-8.3: Miscellaneous Damage

```
Scenario: Miscellaneous damage without wager
  When POST /api/damage-records {
    isMiscellaneous: true, wagerId: null, productId, detectionPoint: "godown",
    grade: "major", damageCount: 3, productionCostPerPiece: 40.00
  }
  Then 201 with isMiscellaneous = true, wagerId = null, totalDeduction calculated

Scenario: Non-miscellaneous damage requires wager
  When POST /api/damage-records {
    isMiscellaneous: false, wagerId: null, ...
  }
  Then 400 "WAGER_REQUIRED"
```

#### IT-8.4: Wager Visibility Restriction

```
Scenario: Wager sees only own damage
  Given wager A has 3 damage records
  And wager B has 2 damage records
  When GET /api/damage-records (as wager A)
  Then 200 with 3 records (all belonging to wager A)

Scenario: Owner sees all damage
  When GET /api/damage-records (as owner)
  Then 200 with 5 records (all damage across all wagers)
```

### Verification Gate

- [ ] All unit tests pass (deduction calc, grade validation, approval flow)
- [ ] IT-8.1 (auto-deduction + rate snapshot) passes
- [ ] IT-8.2 (owner approval workflow) passes
- [ ] IT-8.3 (miscellaneous damage) passes
- [ ] IT-8.4 (wager visibility restriction) passes
- [ ] Curl manual testing done (see 06e)
- [ ] `db-reviewer` approved damage_records migration
- [ ] `business-logic-validator` approved deduction formula and approval workflow
- [ ] `checklist-validator` confirmed: CL-DB-11 (7 items) + CL-BE-08 (9 items)
- [ ] i18n keys added for all damage-related strings
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint warnings (`pnpm lint`)

---

## Phase 7: Post-Production (Tailoring & Packaging)

> **Dependencies:** Phase 5 | **Epic coverage:** DB Epic 7 + BE Epic 9 | **CL items:** CL-DB-12 (7 items), CL-BE-09 (10 items) | **Endpoints:** 4 | **Tests:** 4 integration

### Overview

Post-production covers two downstream operations after weaving: **tailoring** (stitching and knotting woven fabrics) and **packaging** (bundling finished products for sale). Both operations trigger inventory stage transitions (woven -> tailored, tailored -> bundled), auto-calculate worker wages, and enforce role-based visibility (tailors see only their own records, packagers see only their own records). Wage calculations use per-product rates configured in Phase 2 master data.

### DB Tables

#### `tailoring_records`

| Column              | Type            | Constraints                      | Notes                                                    |
| ------------------- | --------------- | -------------------------------- | -------------------------------------------------------- |
| `id`                | `uuid`          | PK, default `gen_random_uuid()`  |                                                          |
| `tenant_id`         | `uuid`          | FK -> tenants, NOT NULL          |                                                          |
| `tailor_id`         | `uuid`          | FK -> users, NOT NULL            | Which tailor performed the work                          |
| `godown_id`         | `uuid`          | FK -> godowns, NOT NULL          |                                                          |
| `product_id`        | `uuid`          | FK -> products, NOT NULL         |                                                          |
| `color`             | `varchar(100)`  | NOT NULL                         |                                                          |
| `batch_id`          | `uuid`          | FK -> batches, NULLABLE          |                                                          |
| `stitch_count`      | `integer`       | NOT NULL                         | Number of pieces stitched                                |
| `knot_count`        | `integer`       | NOT NULL, default `0`            | Number of pieces knotted (0 if not applicable)           |
| `stitch_wage`       | `decimal(10,2)` | NOT NULL                         | Auto-calc: stitch_count \* product.stitch_rate_per_piece |
| `knot_wage`         | `decimal(10,2)` | NOT NULL, default `0`            | Auto-calc: knot_count \* product.knot_rate_per_piece     |
| `total_wage`        | `decimal(10,2)` | NOT NULL                         | Auto-calc: stitch_wage + knot_wage                       |
| `mismatch_detected` | `boolean`       | NOT NULL, default `false`        | True if count mismatch with woven inventory              |
| `work_date`         | `date`          | NOT NULL, default `CURRENT_DATE` |                                                          |
| `notes`             | `text`          | NULLABLE                         |                                                          |
| `created_by`        | `uuid`          | FK -> users, NOT NULL            |                                                          |
| `created_at`        | `timestamptz`   | NOT NULL, default `now()`        |                                                          |
| `updated_at`        | `timestamptz`   | NOT NULL, default `now()`        |                                                          |

**Indexes:**

- `idx_tailoring_records_tenant_tailor` on `(tenant_id, tailor_id)`
- `idx_tailoring_records_tenant_date` on `(tenant_id, work_date)`
- `idx_tailoring_records_tenant_product` on `(tenant_id, product_id)`

**RLS Policy:**

- `tailoring_record_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

#### `packaging_records`

| Column              | Type                    | Constraints                      | Notes                                        |
| ------------------- | ----------------------- | -------------------------------- | -------------------------------------------- |
| `id`                | `uuid`                  | PK, default `gen_random_uuid()`  |                                              |
| `tenant_id`         | `uuid`                  | FK -> tenants, NOT NULL          |                                              |
| `packager_id`       | `uuid`                  | FK -> users, NOT NULL            | Which packager performed the work            |
| `godown_id`         | `uuid`                  | FK -> godowns, NOT NULL          |                                              |
| `product_id`        | `uuid`                  | FK -> products, NOT NULL         |                                              |
| `color`             | `varchar(100)`          | NOT NULL                         |                                              |
| `batch_id`          | `uuid`                  | FK -> batches, NULLABLE          |                                              |
| `bundle_type`       | `enum('small','large')` | NOT NULL                         | Determines pieces per bundle                 |
| `bundle_count`      | `integer`               | NOT NULL                         | Number of bundles created                    |
| `pieces_per_bundle` | `integer`               | NOT NULL                         | Looked up from product config                |
| `total_pieces`      | `integer`               | NOT NULL                         | Auto-calc: bundle_count \* pieces_per_bundle |
| `bundle_rate`       | `decimal(10,2)`         | NOT NULL                         | Rate per bundle from product config          |
| `total_wage`        | `decimal(10,2)`         | NOT NULL                         | Auto-calc: bundle_count \* bundle_rate       |
| `work_date`         | `date`                  | NOT NULL, default `CURRENT_DATE` |                                              |
| `notes`             | `text`                  | NULLABLE                         |                                              |
| `created_by`        | `uuid`                  | FK -> users, NOT NULL            |                                              |
| `created_at`        | `timestamptz`           | NOT NULL, default `now()`        |                                              |
| `updated_at`        | `timestamptz`           | NOT NULL, default `now()`        |                                              |

**Indexes:**

- `idx_packaging_records_tenant_packager` on `(tenant_id, packager_id)`
- `idx_packaging_records_tenant_date` on `(tenant_id, work_date)`
- `idx_packaging_records_tenant_product` on `(tenant_id, product_id)`

**RLS Policy:**

- `packaging_record_tenant_isolation`: `tenant_id = current_setting('app.tenant_id')::uuid`

### Skills to Invoke (ordered table)

| Order | Skill           | Command                                                                     | Purpose                                      |
| ----- | --------------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| 1     | DB Migration    | `/db-migration tailoring_records`                                           | Create tailoring records table, RLS, indexes |
| 2     | DB Migration    | `/db-migration packaging_records`                                           | Create packaging records table, RLS, indexes |
| 3     | Scaffold Module | `/scaffold-module tailoring-records`                                        | Full module with wage auto-calc              |
| 4     | Scaffold Module | `/scaffold-module packaging-records`                                        | Full module with bundle/wage calc            |
| 5     | Generate Test   | `/generate-test tailoring-records unit`                                     | Unit tests for stitch/knot wage calculation  |
| 6     | Generate Test   | `/generate-test tailoring-records integration`                              | Integration tests for inventory transition   |
| 7     | Generate Test   | `/generate-test packaging-records unit`                                     | Unit tests for bundle/wage calculation       |
| 8     | Generate Test   | `/generate-test packaging-records integration`                              | Integration tests for inventory transition   |
| 9     | Generate Seed   | `/generate-seed tailoring_records`                                          | Realistic tailoring data                     |
| 10    | Generate Seed   | `/generate-seed packaging_records`                                          | Realistic packaging data                     |
| 11    | Add Translation | `/add-translation tailoring.stitch_wage "Stitch Wage" "தையல் ஊதியம்"`       | i18n keys                                    |
| 12    | Add Translation | `/add-translation packaging.bundle_type.small "Small Bundle" "சிறிய கட்டு"` | i18n keys                                    |

### Agent Activation Flow

```
TM2 (Domain Advisor)
  → Clarify: How does mismatch detection work for tailoring?
  → Answer: Compare stitch_count against available woven inventory.
            If stitch_count > woven inventory for that product/color/godown,
            set mismatch_detected = true (suspicious over-reporting).
  → Clarify: What determines pieces_per_bundle?
  → Answer: Each product has small_bundle_pieces and large_bundle_pieces
            configured in the products table (Phase 2).

TM1 (DB Architect)
  → /db-migration tailoring_records
  → /db-migration packaging_records
  → db-reviewer validates: tenant_id, RLS, FK references to products/users

TM3 (Backend Builder)
  → /scaffold-module tailoring-records
  → /scaffold-module packaging-records
  → Implements: wage auto-calculation from product rates,
    inventory stage transitions (woven→tailored, tailored→bundled),
    mismatch detection, bundle type→pieces lookup,
    role-based visibility (tailor/packager sees only own)
  → business-logic-validator checks wage formulas

TM5 (QA Engineer)
  → /generate-test tailoring-records unit
  → /generate-test tailoring-records integration
  → /generate-test packaging-records unit
  → /generate-test packaging-records integration
  → Tests wage calc, inventory transitions, visibility restriction

TM6 (Progress Tracker)
  → Validates CL-DB-12 (7 items) and CL-BE-09 (10 items) completion
```

### TDD Steps (RED/GREEN/REFACTOR)

#### RED Phase

Write failing tests for:

**Tailoring tests:**

1. POST /api/tailoring-records auto-calculates stitch_wage = stitch_count \* product.stitch_rate_per_piece
2. POST /api/tailoring-records auto-calculates knot_wage = knot_count \* product.knot_rate_per_piece
3. POST /api/tailoring-records auto-calculates total_wage = stitch_wage + knot_wage
4. POST /api/tailoring-records with knot_count=0 sets knot_wage=0 and total_wage=stitch_wage
5. POST /api/tailoring-records decreases woven inventory and increases tailored inventory
6. POST /api/tailoring-records detects mismatch when stitch_count > available woven inventory
7. POST /api/tailoring-records does NOT set mismatch when stitch_count <= woven inventory
8. GET /api/tailoring-records as tailor returns only own records
9. GET /api/tailoring-records as owner returns all records

**Packaging tests:** 10. POST /api/packaging-records looks up pieces*per_bundle from product by bundle_type 11. POST /api/packaging-records auto-calculates total_pieces = bundle_count * pieces*per_bundle 12. POST /api/packaging-records auto-calculates total_wage = bundle_count * bundle_rate 13. POST /api/packaging-records looks up bundle_rate from product config by bundle_type 14. POST /api/packaging-records decreases tailored inventory and increases bundled inventory 15. POST /api/packaging-records with insufficient tailored stock returns 400 16. GET /api/packaging-records as packager returns only own records 17. GET /api/packaging-records as owner returns all records

**Tenant isolation tests:** 18. Tenant A's tailoring/packaging records are invisible to Tenant B

```bash
pnpm test -- --run src/modules/tailoring-records/__tests__/tailoring-records.unit.test.ts
pnpm test -- --run src/modules/packaging-records/__tests__/packaging-records.unit.test.ts
# Expected: ALL FAIL
```

#### GREEN Phase

1. Run both migrations
2. Scaffold both modules
3. Implement tailoring with wage auto-calc:

   ```typescript
   async function createTailoringRecord(data: CreateTailoringRecordDto) {
     return withTransaction(async (tx) => {
       // Fetch product rates
       const product = await productRepo.findById(
         data.productId,
         data.tenantId,
       );

       // Calculate wages
       const stitchWage = data.stitchCount * product.stitchRatePerPiece;
       const knotWage = data.knotCount * product.knotRatePerPiece;
       const totalWage = stitchWage + knotWage;

       // Mismatch detection: check woven inventory
       const wovenStock = await inventoryService.getStock(tx, {
         tenantId: data.tenantId,
         godownId: data.godownId,
         productId: data.productId,
         color: data.color,
         stage: "woven",
         batchId: data.batchId,
       });
       const mismatchDetected =
         !wovenStock || data.stitchCount > wovenStock.quantity;

       // Inventory transition: woven → tailored
       await inventoryService.decrease(tx, {
         ...dimensions,
         stage: "woven",
         quantity: data.stitchCount,
       });
       await inventoryService.increase(tx, {
         ...dimensions,
         stage: "tailored",
         quantity: data.stitchCount,
       });

       // Create record
       return tailoringRecordRepo.create(tx, {
         ...data,
         stitchWage,
         knotWage,
         totalWage,
         mismatchDetected,
       });
     });
   }
   ```

4. Implement packaging with bundle lookup:

   ```typescript
   async function createPackagingRecord(data: CreatePackagingRecordDto) {
     return withTransaction(async (tx) => {
       // Fetch product config
       const product = await productRepo.findById(
         data.productId,
         data.tenantId,
       );

       // Lookup pieces_per_bundle and bundle_rate by bundle_type
       const piecesPerBundle =
         data.bundleType === "small"
           ? product.smallBundlePieces
           : product.largeBundlePieces;
       const bundleRate =
         data.bundleType === "small"
           ? product.smallBundleRate
           : product.largeBundleRate;

       // Calculate totals
       const totalPieces = data.bundleCount * piecesPerBundle;
       const totalWage = data.bundleCount * bundleRate;

       // Check tailored stock
       const tailoredStock = await inventoryService.getStock(tx, {
         ...dimensions,
         stage: "tailored",
       });
       if (!tailoredStock || tailoredStock.quantity < totalPieces) {
         throw new AppError(
           "INSUFFICIENT_TAILORED_STOCK",
           400,
           `Insufficient tailored stock. Available: ${tailoredStock?.quantity ?? 0}`,
         );
       }

       // Inventory transition: tailored → bundled
       await inventoryService.decrease(tx, {
         ...dimensions,
         stage: "tailored",
         quantity: totalPieces,
       });
       await inventoryService.increase(tx, {
         ...dimensions,
         stage: "bundled",
         quantity: totalPieces,
       });

       // Create record
       return packagingRecordRepo.create(tx, {
         ...data,
         piecesPerBundle,
         totalPieces,
         bundleRate,
         totalWage,
       });
     });
   }
   ```

5. Implement role-based visibility:

   ```typescript
   // Reuse pattern from Phase 6 damage visibility
   async function findTailoringRecords(tenantId, filters, userRole, userId) {
     let query = baseQuery.where("tenant_id", tenantId);
     if (userRole === "tailor") {
       query = query.where("tailor_id", userId);
     }
     return query;
   }

   async function findPackagingRecords(tenantId, filters, userRole, userId) {
     let query = baseQuery.where("tenant_id", tenantId);
     if (userRole === "packager") {
       query = query.where("packager_id", userId);
     }
     return query;
   }
   ```

```bash
pnpm test -- --run src/modules/tailoring-records/__tests__/tailoring-records.unit.test.ts
pnpm test -- --run src/modules/packaging-records/__tests__/packaging-records.unit.test.ts
# Expected: ALL PASS
```

#### REFACTOR Phase

- Extract role-based visibility pattern to shared utility (was also used in Phase 6)
- Extract inventory transition pattern: decrease(stage_from) + increase(stage_to) as `inventoryService.transition()`
- Verify wage calculations use decimal precision consistently (no floating-point rounding issues)
- Add i18n keys: tailoring labels, packaging labels, bundle types, wage descriptions
- Confirm product rates (stitch_rate, knot_rate, bundle_rate) are fetched fresh from DB (not cached stale)

### Curl Commands (reference to 06e)

See [06e-curl-reference.md](./06e-curl-reference.md) for complete curl commands. Key endpoints:

| Method | Path                     | Purpose                           |
| ------ | ------------------------ | --------------------------------- |
| POST   | `/api/tailoring-records` | Record tailoring work             |
| GET    | `/api/tailoring-records` | List tailoring records (filtered) |
| POST   | `/api/packaging-records` | Record packaging work             |
| GET    | `/api/packaging-records` | List packaging records (filtered) |

### Integration Tests

#### IT-9.1: Tailoring Wage Auto-Calculation

```
Scenario: Tailoring record with stitch and knot
  Given product "Single Khadi" with:
    - stitch_rate_per_piece = 2.50
    - knot_rate_per_piece = 1.00
  And woven inventory = 200 pieces (White, Main Godown)
  When POST /api/tailoring-records {
    tailorId, godownId, productId, color: "White",
    stitchCount: 100, knotCount: 50
  }
  Then 201 with:
    - stitchWage = 250.00 (100 * 2.50)
    - knotWage = 50.00 (50 * 1.00)
    - totalWage = 300.00
    - mismatchDetected = false
  And woven inventory = 100 (200 - 100)
  And tailored inventory = 100

Scenario: Tailoring with knot_count = 0
  When POST /api/tailoring-records { stitchCount: 50, knotCount: 0 }
  Then 201 with:
    - stitchWage = 125.00
    - knotWage = 0.00
    - totalWage = 125.00
```

#### IT-9.2: Tailoring Mismatch Detection

```
Scenario: Stitch count exceeds woven inventory
  Given woven inventory = 30 pieces
  When POST /api/tailoring-records { stitchCount: 50 }
  Then 201 with mismatchDetected = true
  Note: Record is still created (mismatch is a flag, not a blocker)
```

#### IT-9.3: Packaging with Bundle Type Lookup

```
Scenario: Package small bundles
  Given product "Single Khadi" with:
    - small_bundle_pieces = 10
    - small_bundle_rate = 5.00
  And tailored inventory = 100 pieces
  When POST /api/packaging-records {
    packagerId, godownId, productId, color: "White",
    bundleType: "small", bundleCount: 8
  }
  Then 201 with:
    - piecesPerBundle = 10
    - totalPieces = 80 (8 * 10)
    - bundleRate = 5.00
    - totalWage = 40.00 (8 * 5.00)
  And tailored inventory = 20 (100 - 80)
  And bundled inventory = 80

Scenario: Packaging with insufficient tailored stock
  Given tailored inventory = 20 pieces
  When POST /api/packaging-records { bundleType: "small", bundleCount: 5 }
  Then 400 "INSUFFICIENT_TAILORED_STOCK" (5 * 10 = 50 > 20)
```

#### IT-9.4: Role-Based Visibility

```
Scenario: Tailor sees only own records
  Given tailor A has 5 tailoring records
  And tailor B has 3 tailoring records
  When GET /api/tailoring-records (as tailor A)
  Then 200 with 5 records

Scenario: Packager sees only own records
  Given packager A has 4 packaging records
  And packager B has 2 packaging records
  When GET /api/packaging-records (as packager A)
  Then 200 with 4 records

Scenario: Owner sees all records
  When GET /api/tailoring-records (as owner)
  Then 200 with 8 records (all tailors)
  When GET /api/packaging-records (as owner)
  Then 200 with 6 records (all packagers)
```

### Verification Gate

- [ ] All unit tests pass (wage calc, bundle lookup, mismatch detection, visibility)
- [ ] IT-9.1 (tailoring wage auto-calculation) passes
- [ ] IT-9.2 (tailoring mismatch detection) passes
- [ ] IT-9.3 (packaging bundle type + wage) passes
- [ ] IT-9.4 (role-based visibility) passes
- [ ] Curl manual testing done (see 06e)
- [ ] `db-reviewer` approved both migration files
- [ ] `business-logic-validator` approved wage formulas and inventory transitions
- [ ] `checklist-validator` confirmed: CL-DB-12 (7 items) + CL-BE-09 (10 items)
- [ ] i18n keys added for all tailoring and packaging strings
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint warnings (`pnpm lint`)

---

## Cross-Phase Summary

### Endpoint Count

| Phase | Module                      | Endpoints | Running Total |
| ----- | --------------------------- | --------- | ------------- |
| 3     | Batches                     | 3         | 3             |
| 4     | Inventory + Cone + Transfer | 7         | 10            |
| 5     | Production (5 modules)      | 14        | 24            |
| 6     | Damage Records              | 6         | 30            |
| 7     | Tailoring + Packaging       | 4         | 34            |

### Integration Test Count

| Phase     | Test IDs         | Count  |
| --------- | ---------------- | ------ |
| 3         | IT-5.1, IT-5.2   | 2      |
| 4         | IT-6.1 to IT-6.3 | 3      |
| 5         | IT-7.1 to IT-7.7 | 7      |
| 6         | IT-8.1 to IT-8.4 | 4      |
| 7         | IT-9.1 to IT-9.4 | 4      |
| **Total** |                  | **20** |

### Checklist Coverage

| Phase     | CL-DB Items     | CL-BE Items     | Total  |
| --------- | --------------- | --------------- | ------ |
| 3         | 4 (08.1-08.4)   | 5 (05.1-05.5)   | 9      |
| 4         | 9 (09.1-09.9)   | 11 (06.1-06.11) | 20     |
| 5         | 11 (10.1-10.11) | 15 (07.1-07.15) | 26     |
| 6         | 7 (11.1-11.7)   | 9 (08.1-08.9)   | 16     |
| 7         | 7 (12.1-12.7)   | 10 (09.1-09.10) | 17     |
| **Total** | **38**          | **50**          | **88** |

### DB Tables Created (Phases 3-7)

| Phase     | Tables                                                                        | Count  |
| --------- | ----------------------------------------------------------------------------- | ------ |
| 3         | batches                                                                       | 1      |
| 4         | inventory, inventory_movements, cone_purchases, inter_godown_transfers        | 4      |
| 5         | cone_issuances, paavu_productions, production_returns, loom_downtimes, shifts | 5      |
| 6         | damage_records                                                                | 1      |
| 7         | tailoring_records, packaging_records                                          | 2      |
| **Total** |                                                                               | **13** |

### Feature Flags Used

| Feature Flag                    | Phase Introduced | Modules Affected                                     |
| ------------------------------- | ---------------- | ---------------------------------------------------- |
| `batch_enabled`                 | 3                | batches, inventory, production, tailoring, packaging |
| `inter_godown_transfer_enabled` | 4                | transfers                                            |
| `shift_enabled`                 | 5                | shifts, production-returns                           |
| `show_wager_ranking`            | 5                | wager performance/ranking                            |

### Shared Patterns Established

| Pattern                     | First Used | Reused In                             |
| --------------------------- | ---------- | ------------------------------------- |
| Feature flag middleware     | Phase 3    | Phase 4 (transfers), Phase 5 (shifts) |
| Inventory increase/decrease | Phase 4    | Phase 5, Phase 7                      |
| Movement logging            | Phase 4    | Phase 5, Phase 7                      |
| Role-based visibility       | Phase 6    | Phase 7                               |
| Approval workflow           | Phase 6    | Phase 8 (wage cycles)                 |
| Inventory stage transition  | Phase 7    | Phase 9 (sales -> sold)               |

---

## Next Steps

After completing Phases 3-7, proceed to:

- **[06c-financial-phases.md](./06c-financial-phases.md)** -- Phase 8 (Wage & Advance) and Phase 9 (Sales & Finance)
  - Phase 8 depends on Phases 5, 6, and 7 (all core phases must be complete)
  - Phase 9 depends on Phases 2 and 4
