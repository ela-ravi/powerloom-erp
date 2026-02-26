# Database Plan — Powerloom ERP V3

## Agile Breakdown: Epics, Stories, Tasks, Sub-tasks

**TDD Approach:** Every task follows Red-Green-Refactor. Write migration tests before writing migrations. Write seed/validation tests before inserting data. Integration tests validate cross-epic relationships.

---

## Epic 1: Foundation & Multi-Tenancy

### Story 1.1: Tenant Management Schema

> As a platform operator, I need a tenants table so that each powerloom business is isolated and independently configurable.

**Feature:** Core tenant table with settings and feature flags.

#### Task 1.1.1: Create `tenants` table migration

| Column       | Type                                 | Constraints                     | Notes                               |
| ------------ | ------------------------------------ | ------------------------------- | ----------------------------------- |
| `id`         | `uuid`                               | PK, default `gen_random_uuid()` |                                     |
| `name`       | `varchar(255)`                       | NOT NULL                        | Business name                       |
| `owner_name` | `varchar(255)`                       | NOT NULL                        | Owner's name                        |
| `phone`      | `varchar(15)`                        | NOT NULL, UNIQUE                | Primary contact                     |
| `email`      | `varchar(255)`                       | NULLABLE                        | Optional                            |
| `address`    | `text`                               | NULLABLE                        |                                     |
| `state_code` | `varchar(2)`                         | NOT NULL                        | For GST intra/inter-state detection |
| `gstin`      | `varchar(15)`                        | NULLABLE                        | GST Identification Number           |
| `status`     | `enum('active','suspended','trial')` | NOT NULL, default `'trial'`     |                                     |
| `created_at` | `timestamptz`                        | NOT NULL, default `now()`       |                                     |
| `updated_at` | `timestamptz`                        | NOT NULL, default `now()`       |                                     |

**Sub-tasks:**

- [ ] Write test: verify tenants table exists with all columns and correct types
- [ ] Write test: verify unique constraint on phone
- [ ] Write test: verify default values (status='trial', timestamps)
- [ ] Create migration file
- [ ] Run migration and verify tests pass
- [ ] Write test: insert and retrieve a tenant record

#### Task 1.1.2: Create `tenant_settings` table migration

| Column                          | Type           | Constraints                | Notes                           |
| ------------------------------- | -------------- | -------------------------- | ------------------------------- |
| `id`                            | `uuid`         | PK                         |                                 |
| `tenant_id`                     | `uuid`         | FK → tenants, UNIQUE       | One settings row per tenant     |
| `batch_enabled`                 | `boolean`      | NOT NULL, default `false`  | Batch system toggle             |
| `shift_enabled`                 | `boolean`      | NOT NULL, default `false`  | Shift tracking toggle           |
| `inter_godown_transfer_enabled` | `boolean`      | NOT NULL, default `false`  |                                 |
| `auth_otp_enabled`              | `boolean`      | NOT NULL, default `true`   | Phone OTP auth                  |
| `auth_pin_enabled`              | `boolean`      | NOT NULL, default `false`  | 4-digit PIN auth                |
| `wage_cycle_day`                | `smallint`     | NOT NULL, default `0`      | 0=Sunday, 1=Monday...6=Saturday |
| `default_credit_period_days`    | `integer`      | NOT NULL, default `30`     |                                 |
| `paavu_wastage_limit_grams`     | `integer`      | NOT NULL, default `500`    | Paavu Pattarai wastage limit    |
| `damage_minor_deduction_pct`    | `decimal(5,2)` | NOT NULL, default `25.00`  | Minor grade %                   |
| `damage_major_deduction_pct`    | `decimal(5,2)` | NOT NULL, default `50.00`  | Major grade %                   |
| `damage_reject_deduction_pct`   | `decimal(5,2)` | NOT NULL, default `100.00` | Reject grade %                  |
| `show_wager_ranking`            | `boolean`      | NOT NULL, default `false`  | Visibility control              |
| `currency`                      | `varchar(3)`   | NOT NULL, default `'INR'`  |                                 |
| `locale`                        | `varchar(10)`  | NOT NULL, default `'en'`   |                                 |
| `created_at`                    | `timestamptz`  | NOT NULL, default `now()`  |                                 |
| `updated_at`                    | `timestamptz`  | NOT NULL, default `now()`  |                                 |

**Sub-tasks:**

- [ ] Write test: verify table schema and FK constraint to tenants
- [ ] Write test: verify UNIQUE constraint on tenant_id (one settings per tenant)
- [ ] Write test: verify all default values
- [ ] Create migration file
- [ ] Run migration and verify tests pass
- [ ] Write test: insert settings for a tenant and verify retrieval

#### Task 1.1.3: Create RLS policy for tenants

**Sub-tasks:**

- [ ] Write test: user from tenant A cannot read tenant B's data
- [ ] Write test: user from tenant A can read their own tenant data
- [ ] Create RLS policy: `tenant_isolation_policy` on tenants table
- [ ] Verify tests pass

---

### Story 1.2: User & Authentication Schema

> As a tenant owner, I need user accounts with role-based access so that different people (staff, wagers, tailors) can use the system with appropriate permissions.

**Feature:** Users, roles, permissions, and authentication support.

#### Task 1.2.1: Create `users` table migration

| Column          | Type                                                              | Constraints               | Notes                          |
| --------------- | ----------------------------------------------------------------- | ------------------------- | ------------------------------ |
| `id`            | `uuid`                                                            | PK                        |                                |
| `tenant_id`     | `uuid`                                                            | FK → tenants, NOT NULL    |                                |
| `phone`         | `varchar(15)`                                                     | NOT NULL                  |                                |
| `name`          | `varchar(255)`                                                    | NOT NULL                  |                                |
| `role`          | `enum('super_admin','owner','staff','wager','tailor','packager')` | NOT NULL                  |                                |
| `pin_hash`      | `varchar(255)`                                                    | NULLABLE                  | Hashed 4-digit PIN             |
| `language`      | `varchar(5)`                                                      | NOT NULL, default `'en'`  | User-level language preference |
| `is_active`     | `boolean`                                                         | NOT NULL, default `true`  |                                |
| `last_login_at` | `timestamptz`                                                     | NULLABLE                  |                                |
| `created_at`    | `timestamptz`                                                     | NOT NULL, default `now()` |                                |
| `updated_at`    | `timestamptz`                                                     | NOT NULL, default `now()` |                                |

**Unique constraint:** `(tenant_id, phone)` — same phone can exist in different tenants.

**Sub-tasks:**

- [ ] Write test: verify table schema with all columns
- [ ] Write test: verify composite unique constraint on (tenant_id, phone)
- [ ] Write test: verify FK to tenants
- [ ] Write test: verify role enum values match spec
- [ ] Create migration file
- [ ] Run migration and verify tests pass
- [ ] Write test: insert users with different roles

#### Task 1.2.2: Create `staff_permissions` table migration

| Column       | Type          | Constraints               | Notes                                                                                                                            |
| ------------ | ------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | `uuid`        | PK                        |                                                                                                                                  |
| `tenant_id`  | `uuid`        | FK → tenants, NOT NULL    |                                                                                                                                  |
| `user_id`    | `uuid`        | FK → users, NOT NULL      |                                                                                                                                  |
| `permission` | `varchar(50)` | NOT NULL                  | e.g., 'godown_management', 'production_entry', 'wage_processing', 'sales_invoicing', 'reports', 'damage_approval', 'master_data' |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |                                                                                                                                  |

**Unique constraint:** `(user_id, permission)` — no duplicate permission per user.

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify unique constraint prevents duplicate permissions
- [ ] Write test: verify FKs to tenants and users
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 1.2.3: Create `otp_codes` table migration

| Column       | Type          | Constraints               | Notes           |
| ------------ | ------------- | ------------------------- | --------------- |
| `id`         | `uuid`        | PK                        |                 |
| `phone`      | `varchar(15)` | NOT NULL                  |                 |
| `code`       | `varchar(6)`  | NOT NULL                  | Hashed OTP code |
| `expires_at` | `timestamptz` | NOT NULL                  |                 |
| `verified`   | `boolean`     | NOT NULL, default `false` |                 |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |                 |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify expiry logic works (expired OTP not valid)
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 1.2.4: Create RLS policies for users and permissions

**Sub-tasks:**

- [ ] Write test: user in tenant A cannot see users from tenant B
- [ ] Write test: wager can only see own user record
- [ ] Write test: owner can see all users in their tenant
- [ ] Create RLS policies on users and staff_permissions tables
- [ ] Verify tests pass

---

### Story 1.3: Audit & Common Infrastructure

> As a system, I need audit logging and common infrastructure tables for cross-cutting concerns.

#### Task 1.3.1: Create `audit_logs` table migration

| Column        | Type          | Constraints               | Notes                                         |
| ------------- | ------------- | ------------------------- | --------------------------------------------- |
| `id`          | `uuid`        | PK                        |                                               |
| `tenant_id`   | `uuid`        | FK → tenants, NOT NULL    |                                               |
| `user_id`     | `uuid`        | FK → users, NULLABLE      | System actions may not have user              |
| `action`      | `varchar(50)` | NOT NULL                  | e.g., 'create', 'update', 'delete', 'approve' |
| `entity_type` | `varchar(50)` | NOT NULL                  | Table/entity name                             |
| `entity_id`   | `uuid`        | NOT NULL                  | Row ID                                        |
| `old_values`  | `jsonb`       | NULLABLE                  | Previous state                                |
| `new_values`  | `jsonb`       | NULLABLE                  | New state                                     |
| `created_at`  | `timestamptz` | NOT NULL, default `now()` |                                               |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify audit log captures old/new values correctly
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 1.3.2: Create `updated_at` trigger function

**Sub-tasks:**

- [ ] Write test: verify updated_at auto-updates on row modification
- [ ] Create reusable trigger function `set_updated_at()`
- [ ] Verify tests pass

---

### Integration Test: Epic 1

- [ ] **IT-1.1**: Create a tenant → create tenant_settings → verify 1:1 relationship
- [ ] **IT-1.2**: Create a tenant → create users with all role types → verify role constraints
- [ ] **IT-1.3**: Create two tenants → verify RLS isolation between them
- [ ] **IT-1.4**: Create staff user → assign permissions → verify permission retrieval
- [ ] **IT-1.5**: Perform CRUD operations → verify audit log entries created

---

## Epic 2: Master Data Management

### Story 2.1: Loom Types & Looms

> As an owner, I need to configure loom types and individual looms so that production capacity and wager assignments can be tracked.

#### Task 2.1.1: Create `loom_types` table migration

| Column                    | Type           | Constraints               | Notes                                                     |
| ------------------------- | -------------- | ------------------------- | --------------------------------------------------------- |
| `id`                      | `uuid`         | PK                        |                                                           |
| `tenant_id`               | `uuid`         | FK → tenants, NOT NULL    |                                                           |
| `name`                    | `varchar(100)` | NOT NULL                  | e.g., 'Single Lengthy', 'Double Lengthy', 'Triple Length' |
| `nickname`                | `varchar(50)`  | NULLABLE                  | e.g., 'Single', 'Box', 'Air Loom'                         |
| `capacity_pieces_per_day` | `integer`      | NOT NULL                  | Capacity per day per loom of this type                    |
| `is_active`               | `boolean`      | NOT NULL, default `true`  |                                                           |
| `created_at`              | `timestamptz`  | NOT NULL, default `now()` |                                                           |
| `updated_at`              | `timestamptz`  | NOT NULL, default `now()` |                                                           |

**Unique constraint:** `(tenant_id, name)`

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify unique constraint (tenant_id, name)
- [ ] Write test: verify capacity_pieces_per_day is positive integer
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 2.1.2: Create `looms` table migration

| Column               | Type                                             | Constraints                       | Notes                      |
| -------------------- | ------------------------------------------------ | --------------------------------- | -------------------------- |
| `id`                 | `uuid`                                           | PK                                |                            |
| `tenant_id`          | `uuid`                                           | FK → tenants, NOT NULL            |                            |
| `loom_type_id`       | `uuid`                                           | FK → loom_types, NOT NULL         |                            |
| `loom_number`        | `varchar(50)`                                    | NOT NULL                          | Display identifier         |
| `assigned_wager_id`  | `uuid`                                           | FK → users, NULLABLE              | Currently assigned wager   |
| `ownership`          | `enum('owner','wager')`                          | NOT NULL                          | Who owns the physical loom |
| `maintenance_status` | `enum('operational','under_maintenance','idle')` | NOT NULL, default `'operational'` |                            |
| `is_active`          | `boolean`                                        | NOT NULL, default `true`          |                            |
| `created_at`         | `timestamptz`                                    | NOT NULL, default `now()`         |                            |
| `updated_at`         | `timestamptz`                                    | NOT NULL, default `now()`         |                            |

**Unique constraint:** `(tenant_id, loom_number)`

**Sub-tasks:**

- [ ] Write test: verify table schema with all FKs
- [ ] Write test: verify loom_number unique per tenant
- [ ] Write test: verify assigned_wager_id references a user with role='wager'
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 2.1.3: Create RLS policies for loom_types and looms

**Sub-tasks:**

- [ ] Write test: tenant isolation on loom_types
- [ ] Write test: tenant isolation on looms
- [ ] Create RLS policies
- [ ] Verify tests pass

---

### Story 2.2: Product Master

> As an owner, I need a product master to define product types with all manufacturing parameters, pricing, and wage rates.

#### Task 2.2.1: Create `products` table migration

| Column                    | Type                                      | Constraints                   | Notes                           |
| ------------------------- | ----------------------------------------- | ----------------------------- | ------------------------------- |
| `id`                      | `uuid`                                    | PK                            |                                 |
| `tenant_id`               | `uuid`                                    | FK → tenants, NOT NULL        |                                 |
| `name`                    | `varchar(255)`                            | NOT NULL                      | e.g., 'Khadi', 'Jakkadu'        |
| `size`                    | `varchar(20)`                             | NOT NULL                      | e.g., '30x60', '27x54', '40x80' |
| `category`                | `enum('single','double','triple','quad')` | NOT NULL                      | Product length category         |
| `paavu_to_piece_ratio`    | `decimal(10,4)`                           | NOT NULL                      | Configured per product          |
| `paavu_consumption_grams` | `decimal(10,2)`                           | NOT NULL                      | Per piece                       |
| `paavu_wastage_grams`     | `decimal(10,2)`                           | NOT NULL, default `0`         | Per piece                       |
| `paavu_wastage_pct`       | `decimal(5,2)`                            | NULLABLE                      | Alternative: percentage-based   |
| `oodai_consumption_grams` | `decimal(10,2)`                           | NOT NULL                      | Per piece                       |
| `oodai_wastage_grams`     | `decimal(10,2)`                           | NOT NULL, default `0`         | Per piece                       |
| `oodai_wastage_pct`       | `decimal(5,2)`                            | NULLABLE                      | Alternative: percentage-based   |
| `wage_rate_per_kg`        | `decimal(10,2)`                           | NOT NULL, default `0`         | For Type 1 & 3 wagers           |
| `wage_rate_per_piece`     | `decimal(10,2)`                           | NOT NULL, default `0`         | For Type 2 & 4 wagers           |
| `stitch_rate_per_piece`   | `decimal(10,2)`                           | NOT NULL, default `0`         | Tailor stitch rate              |
| `knot_rate_per_piece`     | `decimal(10,2)`                           | NOT NULL, default `0`         | Tailor knot rate                |
| `small_bundle_count`      | `integer`                                 | NOT NULL, default `10`        | Pieces per small bundle         |
| `large_bundle_count`      | `integer`                                 | NOT NULL, default `50`        | Pieces per large bundle         |
| `bundle_rate_small`       | `decimal(10,2)`                           | NOT NULL, default `0`         | Packager rate per small bundle  |
| `bundle_rate_large`       | `decimal(10,2)`                           | NOT NULL, default `0`         | Packager rate per large bundle  |
| `gst_rate_pct`            | `decimal(5,2)`                            | NOT NULL, default `5.00`      | GST % for this product          |
| `color_pricing_mode`      | `enum('average','per_color')`             | NOT NULL, default `'average'` | Mode 1 or Mode 2                |
| `hsn_code`                | `varchar(20)`                             | NULLABLE                      | HSN code for GST                |
| `is_active`               | `boolean`                                 | NOT NULL, default `true`      |                                 |
| `created_at`              | `timestamptz`                             | NOT NULL, default `now()`     |                                 |
| `updated_at`              | `timestamptz`                             | NOT NULL, default `now()`     |                                 |

**Unique constraint:** `(tenant_id, name, size)`

**Sub-tasks:**

- [ ] Write test: verify table schema with all columns and types
- [ ] Write test: verify unique constraint (tenant_id, name, size)
- [ ] Write test: verify category enum values
- [ ] Write test: verify decimal precision for rates
- [ ] Create migration file
- [ ] Run migration and verify tests pass
- [ ] Write test: insert a product and verify all fields

#### Task 2.2.2: Create `product_color_prices` table migration

| Column                    | Type            | Constraints               | Notes |
| ------------------------- | --------------- | ------------------------- | ----- |
| `id`                      | `uuid`          | PK                        |       |
| `tenant_id`               | `uuid`          | FK → tenants, NOT NULL    |       |
| `product_id`              | `uuid`          | FK → products, NOT NULL   |       |
| `color`                   | `varchar(50)`   | NOT NULL                  |       |
| `selling_price_per_piece` | `decimal(10,2)` | NOT NULL                  |       |
| `created_at`              | `timestamptz`   | NOT NULL, default `now()` |       |
| `updated_at`              | `timestamptz`   | NOT NULL, default `now()` |       |

**Unique constraint:** `(product_id, color)`

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify unique constraint per product-color combo
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 2.2.3: Create `shift_wage_rates` table migration (optional feature)

| Column                | Type                                | Constraints               | Notes |
| --------------------- | ----------------------------------- | ------------------------- | ----- |
| `id`                  | `uuid`                              | PK                        |       |
| `tenant_id`           | `uuid`                              | FK → tenants, NOT NULL    |       |
| `product_id`          | `uuid`                              | FK → products, NOT NULL   |       |
| `shift`               | `enum('morning','evening','night')` | NOT NULL                  |       |
| `wage_rate_per_kg`    | `decimal(10,2)`                     | NOT NULL                  |       |
| `wage_rate_per_piece` | `decimal(10,2)`                     | NOT NULL                  |       |
| `created_at`          | `timestamptz`                       | NOT NULL, default `now()` |       |
| `updated_at`          | `timestamptz`                       | NOT NULL, default `now()` |       |

**Unique constraint:** `(product_id, shift)`

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify shift enum values
- [ ] Write test: verify unique constraint per product-shift combo
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 2.2.4: Create RLS policies for products tables

**Sub-tasks:**

- [ ] Write test: tenant isolation on products
- [ ] Write test: tenant isolation on product_color_prices
- [ ] Write test: tenant isolation on shift_wage_rates
- [ ] Create RLS policies
- [ ] Verify tests pass

---

### Story 2.3: Supplier & Customer Master

> As an owner, I need to manage supplier and customer records for procurement and sales.

#### Task 2.3.1: Create `suppliers` table migration

| Column       | Type           | Constraints               | Notes            |
| ------------ | -------------- | ------------------------- | ---------------- |
| `id`         | `uuid`         | PK                        |                  |
| `tenant_id`  | `uuid`         | FK → tenants, NOT NULL    |                  |
| `name`       | `varchar(255)` | NOT NULL                  | Cotton mill name |
| `phone`      | `varchar(15)`  | NULLABLE                  |                  |
| `address`    | `text`         | NULLABLE                  |                  |
| `gstin`      | `varchar(15)`  | NULLABLE                  |                  |
| `is_active`  | `boolean`      | NOT NULL, default `true`  |                  |
| `created_at` | `timestamptz`  | NOT NULL, default `now()` |                  |
| `updated_at` | `timestamptz`  | NOT NULL, default `now()` |                  |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify FK to tenants
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 2.3.2: Create `customers` table migration

| Column                | Type                                                          | Constraints               | Notes                     |
| --------------------- | ------------------------------------------------------------- | ------------------------- | ------------------------- |
| `id`                  | `uuid`                                                        | PK                        |                           |
| `tenant_id`           | `uuid`                                                        | FK → tenants, NOT NULL    |                           |
| `name`                | `varchar(255)`                                                | NOT NULL                  |                           |
| `phone`               | `varchar(15)`                                                 | NULLABLE                  |                           |
| `address`             | `text`                                                        | NULLABLE                  |                           |
| `state_code`          | `varchar(2)`                                                  | NOT NULL                  | For GST intra/inter-state |
| `gstin`               | `varchar(15)`                                                 | NULLABLE                  |                           |
| `customer_type`       | `enum('wholesale_partial','wholesale_bill_to_bill','retail')` | NOT NULL                  |                           |
| `credit_period_days`  | `integer`                                                     | NOT NULL, default `30`    | Configurable per customer |
| `outstanding_balance` | `decimal(12,2)`                                               | NOT NULL, default `0`     | Real-time balance         |
| `is_active`           | `boolean`                                                     | NOT NULL, default `true`  |                           |
| `created_at`          | `timestamptz`                                                 | NOT NULL, default `now()` |                           |
| `updated_at`          | `timestamptz`                                                 | NOT NULL, default `now()` |                           |

**Sub-tasks:**

- [ ] Write test: verify table schema with all columns
- [ ] Write test: verify customer_type enum values match spec (3 types)
- [ ] Write test: verify state_code is required (for GST detection)
- [ ] Write test: verify default credit_period_days = 30
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 2.3.3: Create `godowns` table migration

| Column        | Type                              | Constraints                  | Notes                      |
| ------------- | --------------------------------- | ---------------------------- | -------------------------- |
| `id`          | `uuid`                            | PK                           |                            |
| `tenant_id`   | `uuid`                            | FK → tenants, NOT NULL       |                            |
| `name`        | `varchar(255)`                    | NOT NULL                     |                            |
| `address`     | `text`                            | NULLABLE                     |                            |
| `is_main`     | `boolean`                         | NOT NULL, default `false`    | One main godown per tenant |
| `godown_type` | `enum('godown','paavu_pattarai')` | NOT NULL, default `'godown'` |                            |
| `is_active`   | `boolean`                         | NOT NULL, default `true`     |                            |
| `created_at`  | `timestamptz`                     | NOT NULL, default `now()`    |                            |
| `updated_at`  | `timestamptz`                     | NOT NULL, default `now()`    |                            |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify godown_type enum values
- [ ] Write test: only one godown can have is_main=true per tenant (application-level or partial unique index)
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 2.3.4: Create RLS policies for suppliers, customers, godowns

**Sub-tasks:**

- [ ] Write test: tenant isolation on each table
- [ ] Create RLS policies
- [ ] Verify tests pass

---

### Story 2.4: Wager Profile

> As an owner, I need wager profiles that capture the wager type (1-4) and link to their user account and assigned loom.

#### Task 2.4.1: Create `wager_profiles` table migration

| Column                | Type            | Constraints                  | Notes                      |
| --------------------- | --------------- | ---------------------------- | -------------------------- |
| `id`                  | `uuid`          | PK                           |                            |
| `tenant_id`           | `uuid`          | FK → tenants, NOT NULL       |                            |
| `user_id`             | `uuid`          | FK → users, NOT NULL, UNIQUE | 1:1 with user              |
| `wager_type`          | `smallint`      | NOT NULL, CHECK (1-4)        | Type 1/2/3/4 per spec      |
| `advance_balance`     | `decimal(12,2)` | NOT NULL, default `0`        | Running advance balance    |
| `original_advance`    | `decimal(12,2)` | NOT NULL, default `0`        | Initial advance given      |
| `additional_advances` | `decimal(12,2)` | NOT NULL, default `0`        | Sum of additional advances |
| `is_active`           | `boolean`       | NOT NULL, default `true`     |                            |
| `created_at`          | `timestamptz`   | NOT NULL, default `now()`    |                            |
| `updated_at`          | `timestamptz`   | NOT NULL, default `now()`    |                            |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify wager_type CHECK constraint (1,2,3,4 only)
- [ ] Write test: verify 1:1 relationship with users via UNIQUE on user_id
- [ ] Write test: verify advance_balance default = 0
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 2.4.2: Create RLS policy for wager_profiles

**Sub-tasks:**

- [ ] Write test: tenant isolation
- [ ] Write test: wager can only see own profile
- [ ] Create RLS policy
- [ ] Verify tests pass

---

### Integration Test: Epic 2

- [ ] **IT-2.1**: Create tenant → create loom_type → create loom → assign wager → verify full chain
- [ ] **IT-2.2**: Create product with color prices → verify color_pricing_mode controls behavior
- [ ] **IT-2.3**: Create product → create shift_wage_rates → verify only when shift_enabled=true
- [ ] **IT-2.4**: Create supplier → create customer (all 3 types) → verify state_code for GST
- [ ] **IT-2.5**: Create godown (main + additional + paavu_pattarai) → verify types
- [ ] **IT-2.6**: Create wager_profile → verify type constraints (1-4) → verify advance tracking fields

---

## Epic 3: Batch System

### Story 3.1: Batch Management

> As an owner (with batch mode enabled), I need to create and manage production batches to track full manufacturing traceability.

#### Task 3.1.1: Create `batches` table migration

| Column            | Type                                  | Constraints                | Notes                             |
| ----------------- | ------------------------------------- | -------------------------- | --------------------------------- |
| `id`              | `uuid`                                | PK                         |                                   |
| `tenant_id`       | `uuid`                                | FK → tenants, NOT NULL     |                                   |
| `batch_number`    | `varchar(50)`                         | NOT NULL                   | Auto-generated, unique per tenant |
| `product_id`      | `uuid`                                | FK → products, NOT NULL    |                                   |
| `color`           | `varchar(50)`                         | NOT NULL                   |                                   |
| `size`            | `varchar(20)`                         | NOT NULL                   |                                   |
| `target_quantity` | `integer`                             | NOT NULL                   | Target pieces                     |
| `actual_quantity` | `integer`                             | NOT NULL, default `0`      | Running count                     |
| `status`          | `enum('open','in_progress','closed')` | NOT NULL, default `'open'` |                                   |
| `created_at`      | `timestamptz`                         | NOT NULL, default `now()`  |                                   |
| `updated_at`      | `timestamptz`                         | NOT NULL, default `now()`  |                                   |

**Unique constraint:** `(tenant_id, batch_number)`

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify batch_number is unique per tenant
- [ ] Write test: verify status enum values (open, in_progress, closed)
- [ ] Write test: verify batch can be reopened (status closed → open)
- [ ] Create migration file
- [ ] Run migration and verify tests pass
- [ ] Write test: verify batch links to product correctly

#### Task 3.1.2: Create RLS policy for batches

**Sub-tasks:**

- [ ] Write test: tenant isolation on batches
- [ ] Create RLS policy
- [ ] Verify tests pass

---

### Integration Test: Epic 3

- [ ] **IT-3.1**: Create batch (with batch_enabled=true) → verify all fields
- [ ] **IT-3.2**: Verify batches table is not used when batch_enabled=false (application-level)
- [ ] **IT-3.3**: Create batch → close → reopen → verify status transitions
- [ ] **IT-3.4**: Create batch → verify it links to product and has correct color/size

---

## Epic 4: Inventory & Raw Materials

### Story 4.1: Cone Purchase & Raw Material

> As an owner, I need to record cone purchases from suppliers to track raw material inventory.

#### Task 4.1.1: Create `cone_purchases` table migration

| Column          | Type            | Constraints               | Notes                    |
| --------------- | --------------- | ------------------------- | ------------------------ |
| `id`            | `uuid`          | PK                        |                          |
| `tenant_id`     | `uuid`          | FK → tenants, NOT NULL    |                          |
| `supplier_id`   | `uuid`          | FK → suppliers, NOT NULL  |                          |
| `godown_id`     | `uuid`          | FK → godowns, NOT NULL    | Where cones are stored   |
| `batch_id`      | `uuid`          | FK → batches, NULLABLE    | Only if batch_enabled    |
| `bale_id`       | `varchar(50)`   | NULLABLE                  | Optional bale identifier |
| `color`         | `varchar(50)`   | NOT NULL                  |                          |
| `weight_kg`     | `decimal(10,2)` | NOT NULL                  |                          |
| `cost_per_kg`   | `decimal(10,2)` | NOT NULL                  |                          |
| `total_cost`    | `decimal(12,2)` | NOT NULL                  | weight_kg \* cost_per_kg |
| `gst_rate_pct`  | `decimal(5,2)`  | NOT NULL, default `0`     |                          |
| `gst_amount`    | `decimal(10,2)` | NOT NULL, default `0`     |                          |
| `purchase_date` | `date`          | NOT NULL                  |                          |
| `created_at`    | `timestamptz`   | NOT NULL, default `now()` |                          |
| `updated_at`    | `timestamptz`   | NOT NULL, default `now()` |                          |

**Sub-tasks:**

- [ ] Write test: verify table schema with all FKs
- [ ] Write test: verify batch_id is nullable (for batch OFF mode)
- [ ] Write test: verify total_cost calculation
- [ ] Create migration file
- [ ] Run migration and verify tests pass
- [ ] Write test: insert cone purchase and verify inventory impact

### Story 4.2: Inventory Stock Tracking

> As an owner, I need to track inventory at every production stage across godowns, products, colors, and batches.

#### Task 4.2.1: Create `inventory` table migration

| Column       | Type                                                           | Constraints               | Notes                        |
| ------------ | -------------------------------------------------------------- | ------------------------- | ---------------------------- |
| `id`         | `uuid`                                                         | PK                        |                              |
| `tenant_id`  | `uuid`                                                         | FK → tenants, NOT NULL    |                              |
| `godown_id`  | `uuid`                                                         | FK → godowns, NOT NULL    |                              |
| `product_id` | `uuid`                                                         | FK → products, NULLABLE   | NULL for raw cone stage      |
| `color`      | `varchar(50)`                                                  | NOT NULL                  |                              |
| `stage`      | `enum('raw_cone','paavu','woven','tailored','bundled','sold')` | NOT NULL                  | 6-stage pipeline             |
| `batch_id`   | `uuid`                                                         | FK → batches, NULLABLE    | NULL if batch OFF            |
| `quantity`   | `decimal(12,2)`                                                | NOT NULL, default `0`     | Pieces, bundles, or count    |
| `weight_kg`  | `decimal(12,2)`                                                | NULLABLE                  | For stages that track weight |
| `unit`       | `enum('kg','pieces','bundles','paavu_count')`                  | NOT NULL                  |                              |
| `created_at` | `timestamptz`                                                  | NOT NULL, default `now()` |                              |
| `updated_at` | `timestamptz`                                                  | NOT NULL, default `now()` |                              |

**Unique constraint:** `(tenant_id, godown_id, product_id, color, stage, batch_id)` — one row per dimension combination. Use `COALESCE` for nullable batch_id.

**Sub-tasks:**

- [ ] Write test: verify table schema with all columns
- [ ] Write test: verify stage enum has all 6 values
- [ ] Write test: verify unit enum values
- [ ] Write test: verify unique dimension constraint
- [ ] Write test: verify product_id can be NULL for raw_cone stage
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 4.2.2: Create `inventory_movements` table migration

| Column           | Type                                       | Constraints               | Notes                                                          |
| ---------------- | ------------------------------------------ | ------------------------- | -------------------------------------------------------------- |
| `id`             | `uuid`                                     | PK                        |                                                                |
| `tenant_id`      | `uuid`                                     | FK → tenants, NOT NULL    |                                                                |
| `inventory_id`   | `uuid`                                     | FK → inventory, NOT NULL  |                                                                |
| `movement_type`  | `enum('in','out','transfer','adjustment')` | NOT NULL                  |                                                                |
| `quantity`       | `decimal(12,2)`                            | NOT NULL                  | Positive for in, negative for out                              |
| `weight_kg`      | `decimal(12,2)`                            | NULLABLE                  |                                                                |
| `reference_type` | `varchar(50)`                              | NOT NULL                  | e.g., 'cone_purchase', 'production_return', 'sale', 'transfer' |
| `reference_id`   | `uuid`                                     | NOT NULL                  | FK to the source record                                        |
| `notes`          | `text`                                     | NULLABLE                  |                                                                |
| `created_at`     | `timestamptz`                              | NOT NULL, default `now()` |                                                                |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify movement_type enum values
- [ ] Write test: verify reference tracking works (polymorphic reference)
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 4.2.3: Create `inter_godown_transfers` table migration

| Column                  | Type                                                    | Constraints               | Notes                        |
| ----------------------- | ------------------------------------------------------- | ------------------------- | ---------------------------- |
| `id`                    | `uuid`                                                  | PK                        |                              |
| `tenant_id`             | `uuid`                                                  | FK → tenants, NOT NULL    |                              |
| `source_godown_id`      | `uuid`                                                  | FK → godowns, NOT NULL    |                              |
| `destination_godown_id` | `uuid`                                                  | FK → godowns, NOT NULL    |                              |
| `product_id`            | `uuid`                                                  | FK → products, NULLABLE   |                              |
| `color`                 | `varchar(50)`                                           | NOT NULL                  |                              |
| `stage`                 | `enum('raw_cone','paavu','woven','tailored','bundled')` | NOT NULL                  |                              |
| `batch_id`              | `uuid`                                                  | FK → batches, NULLABLE    | Maintains batch traceability |
| `quantity`              | `decimal(12,2)`                                         | NOT NULL                  |                              |
| `weight_kg`             | `decimal(12,2)`                                         | NULLABLE                  |                              |
| `transfer_date`         | `date`                                                  | NOT NULL                  |                              |
| `notes`                 | `text`                                                  | NULLABLE                  |                              |
| `created_at`            | `timestamptz`                                           | NOT NULL, default `now()` |                              |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify source and destination godowns are different
- [ ] Write test: verify batch_id is preserved during transfer (when batch ON)
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 4.2.4: Create RLS policies for inventory tables

**Sub-tasks:**

- [ ] Write test: tenant isolation on inventory, inventory_movements, inter_godown_transfers
- [ ] Create RLS policies
- [ ] Verify tests pass

---

### Integration Test: Epic 4

- [ ] **IT-4.1**: Purchase cone → verify inventory row created at raw_cone stage → verify movement logged
- [ ] **IT-4.2**: Track full inventory dimension: godown + product + color + stage + batch
- [ ] **IT-4.3**: Transfer between godowns → verify source decremented, destination incremented
- [ ] **IT-4.4**: Verify batch_id nullable when batch_enabled=false
- [ ] **IT-4.5**: Verify inventory_movements audit trail for all operations

---

## Epic 5: Production System

### Story 5.1: Cone Issuance to Wagers

> As an owner, I need to issue cones to wagers so they can produce woven fabrics.

#### Task 5.1.1: Create `cone_issuances` table migration

| Column       | Type            | Constraints                   | Notes                  |
| ------------ | --------------- | ----------------------------- | ---------------------- |
| `id`         | `uuid`          | PK                            |                        |
| `tenant_id`  | `uuid`          | FK → tenants, NOT NULL        |                        |
| `wager_id`   | `uuid`          | FK → wager_profiles, NOT NULL |                        |
| `godown_id`  | `uuid`          | FK → godowns, NOT NULL        | Source godown          |
| `batch_id`   | `uuid`          | FK → batches, NULLABLE        | One issuance per batch |
| `product_id` | `uuid`          | FK → products, NOT NULL       |                        |
| `color`      | `varchar(50)`   | NOT NULL                      |                        |
| `weight_kg`  | `decimal(10,2)` | NOT NULL                      | Weight of cones issued |
| `issue_date` | `date`          | NOT NULL                      |                        |
| `notes`      | `text`          | NULLABLE                      |                        |
| `created_at` | `timestamptz`   | NOT NULL, default `now()`     |                        |
| `updated_at` | `timestamptz`   | NOT NULL, default `now()`     |                        |

**Sub-tasks:**

- [ ] Write test: verify table schema with all FKs
- [ ] Write test: verify issuance decreases raw_cone inventory
- [ ] Write test: verify single batch per issuance for traceability
- [ ] Create migration file
- [ ] Run migration and verify tests pass

### Story 5.2: Paavu Production (Warp Unit)

> As an owner, I need to track Paavu production in the Paavu Pattarai including counts and wastage.

#### Task 5.2.1: Create `paavu_productions` table migration

| Column                | Type            | Constraints               | Notes                       |
| --------------------- | --------------- | ------------------------- | --------------------------- |
| `id`                  | `uuid`          | PK                        |                             |
| `tenant_id`           | `uuid`          | FK → tenants, NOT NULL    |                             |
| `paavu_oati_id`       | `uuid`          | FK → users, NOT NULL      | Worker who prepared paavu   |
| `godown_id`           | `uuid`          | FK → godowns, NOT NULL    | Paavu pattarai location     |
| `batch_id`            | `uuid`          | FK → batches, NULLABLE    |                             |
| `product_id`          | `uuid`          | FK → products, NOT NULL   |                             |
| `color`               | `varchar(50)`   | NOT NULL                  |                             |
| `cone_weight_used_kg` | `decimal(10,2)` | NOT NULL                  | Input weight                |
| `paavu_count`         | `integer`       | NOT NULL                  | Output paavu count          |
| `wastage_grams`       | `decimal(10,2)` | NOT NULL                  | Actual wastage              |
| `production_date`     | `date`          | NOT NULL                  |                             |
| `wastage_flag`        | `boolean`       | NOT NULL, default `false` | Auto-set if wastage > limit |
| `created_at`          | `timestamptz`   | NOT NULL, default `now()` |                             |
| `updated_at`          | `timestamptz`   | NOT NULL, default `now()` |                             |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify wastage_flag triggers when wastage > tenant limit
- [ ] Write test: verify inventory transition (raw_cone decreases, paavu increases)
- [ ] Create migration file
- [ ] Run migration and verify tests pass

### Story 5.3: Wager Production Returns

> As an owner/staff, I need to record production returns from wagers with weight and/or count based on wager type.

#### Task 5.3.1: Create `production_returns` table migration

| Column             | Type                                | Constraints                   | Notes                     |
| ------------------ | ----------------------------------- | ----------------------------- | ------------------------- |
| `id`               | `uuid`                              | PK                            |                           |
| `tenant_id`        | `uuid`                              | FK → tenants, NOT NULL        |                           |
| `wager_id`         | `uuid`                              | FK → wager_profiles, NOT NULL |                           |
| `cone_issuance_id` | `uuid`                              | FK → cone_issuances, NULLABLE | Link to original issuance |
| `batch_id`         | `uuid`                              | FK → batches, NULLABLE        |                           |
| `product_id`       | `uuid`                              | FK → products, NOT NULL       |                           |
| `color`            | `varchar(50)`                       | NOT NULL                      |                           |
| `loom_id`          | `uuid`                              | FK → looms, NULLABLE          |                           |
| `shift`            | `enum('morning','evening','night')` | NULLABLE                      | Only if shift_enabled     |
| `return_weight_kg` | `decimal(10,2)`                     | NULLABLE                      | Mandatory for Type 1 & 3  |
| `return_count`     | `integer`                           | NULLABLE                      | Mandatory for Type 2 & 4  |
| `wastage_grams`    | `decimal(10,2)`                     | NULLABLE                      |                           |
| `wastage_flag`     | `boolean`                           | NOT NULL, default `false`     |                           |
| `return_date`      | `date`                              | NOT NULL                      |                           |
| `notes`            | `text`                              | NULLABLE                      |                           |
| `created_at`       | `timestamptz`                       | NOT NULL, default `now()`     |                           |
| `updated_at`       | `timestamptz`                       | NOT NULL, default `now()`     |                           |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: Type 1 & 3 wager → return_weight_kg is mandatory
- [ ] Write test: Type 2 & 4 wager → return_count is mandatory
- [ ] Write test: verify inventory moves to woven stage
- [ ] Write test: verify wastage calculation and flagging
- [ ] Write test: verify shift field is nullable (only used when shift_enabled)
- [ ] Create migration file
- [ ] Run migration and verify tests pass

### Story 5.4: Loom Downtime

> As an owner or wager, I need to record loom downtime to adjust production expectations.

#### Task 5.4.1: Create `loom_downtimes` table migration

| Column          | Type                                                | Constraints                   | Notes                |
| --------------- | --------------------------------------------------- | ----------------------------- | -------------------- |
| `id`            | `uuid`                                              | PK                            |                      |
| `tenant_id`     | `uuid`                                              | FK → tenants, NOT NULL        |                      |
| `loom_id`       | `uuid`                                              | FK → looms, NOT NULL          |                      |
| `wager_id`      | `uuid`                                              | FK → wager_profiles, NULLABLE |                      |
| `reported_by`   | `uuid`                                              | FK → users, NOT NULL          | Owner or wager       |
| `reason`        | `enum('maintenance','electricity','leave','other')` | NOT NULL                      |                      |
| `custom_reason` | `varchar(255)`                                      | NULLABLE                      | When reason='other'  |
| `start_date`    | `date`                                              | NOT NULL                      |                      |
| `end_date`      | `date`                                              | NULLABLE                      | NULL = ongoing       |
| `downtime_days` | `decimal(5,2)`                                      | NULLABLE                      | Calculated or manual |
| `created_at`    | `timestamptz`                                       | NOT NULL, default `now()`     |                      |
| `updated_at`    | `timestamptz`                                       | NOT NULL, default `now()`     |                      |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify reason enum values
- [ ] Write test: verify downtime_days calculation from start_date to end_date
- [ ] Write test: verify both owner and wager can create records
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 5.4.2: Create `shifts` table migration (optional feature)

| Column       | Type          | Constraints               | Notes                               |
| ------------ | ------------- | ------------------------- | ----------------------------------- |
| `id`         | `uuid`        | PK                        |                                     |
| `tenant_id`  | `uuid`        | FK → tenants, NOT NULL    |                                     |
| `name`       | `varchar(50)` | NOT NULL                  | e.g., 'Morning', 'Evening', 'Night' |
| `start_time` | `time`        | NOT NULL                  |                                     |
| `end_time`   | `time`        | NOT NULL                  |                                     |
| `is_active`  | `boolean`     | NOT NULL, default `true`  |                                     |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |                                     |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |                                     |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify shift times don't overlap (application-level)
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 5.4.3: Create RLS policies for production tables

**Sub-tasks:**

- [ ] Write test: tenant isolation on all production tables
- [ ] Write test: wager can only see own production_returns
- [ ] Create RLS policies
- [ ] Verify tests pass

---

### Integration Test: Epic 5

- [ ] **IT-5.1**: Issue cone → produce paavu → return production → verify full pipeline
- [ ] **IT-5.2**: Cone issuance → verify raw_cone inventory decreases
- [ ] **IT-5.3**: Production return → verify woven inventory increases
- [ ] **IT-5.4**: Test Type 1/3 wager: weight mandatory, count optional
- [ ] **IT-5.5**: Test Type 2/4 wager: count mandatory, weight optional
- [ ] **IT-5.6**: Record downtime → verify capacity adjustment calculation
- [ ] **IT-5.7**: Shift-based production return (when shift_enabled=true)
- [ ] **IT-5.8**: Cone issue with batch → production return with batch → verify batch traceability

---

## Epic 6: Damage Management

### Story 6.1: Damage Recording & Grading

> As an owner, I need to record and grade damage at multiple detection points with traceability to the original wager.

#### Task 6.1.1: Create `damage_records` table migration

| Column                      | Type                                                           | Constraints                       | Notes                                     |
| --------------------------- | -------------------------------------------------------------- | --------------------------------- | ----------------------------------------- |
| `id`                        | `uuid`                                                         | PK                                |                                           |
| `tenant_id`                 | `uuid`                                                         | FK → tenants, NOT NULL            |                                           |
| `production_return_id`      | `uuid`                                                         | FK → production_returns, NULLABLE | Link to original production               |
| `wager_id`                  | `uuid`                                                         | FK → wager_profiles, NULLABLE     | NULL if unidentifiable (miscellaneous)    |
| `batch_id`                  | `uuid`                                                         | FK → batches, NULLABLE            |                                           |
| `product_id`                | `uuid`                                                         | FK → products, NOT NULL           |                                           |
| `color`                     | `varchar(50)`                                                  | NOT NULL                          |                                           |
| `detection_point`           | `enum('inspection','tailoring','packaging','customer_return')` | NOT NULL                          |                                           |
| `grade`                     | `enum('minor','major','reject')`                               | NOT NULL                          |                                           |
| `damage_count`              | `integer`                                                      | NOT NULL                          | Number of damaged pieces                  |
| `deduction_rate_pct`        | `decimal(5,2)`                                                 | NOT NULL                          | From tenant settings at time of recording |
| `production_cost_per_piece` | `decimal(10,2)`                                                | NOT NULL                          | Material + wage cost                      |
| `total_deduction`           | `decimal(12,2)`                                                | NOT NULL                          | Calculated: count _ cost _ rate%          |
| `is_miscellaneous`          | `boolean`                                                      | NOT NULL, default `false`         | True when wager unidentifiable            |
| `approval_status`           | `enum('pending','approved','rejected')`                        | NOT NULL, default `'pending'`     |                                           |
| `approved_by`               | `uuid`                                                         | FK → users, NULLABLE              |                                           |
| `approved_at`               | `timestamptz`                                                  | NULLABLE                          |                                           |
| `notes`                     | `text`                                                         | NULLABLE                          |                                           |
| `created_at`                | `timestamptz`                                                  | NOT NULL, default `now()`         |                                           |
| `updated_at`                | `timestamptz`                                                  | NOT NULL, default `now()`         |                                           |

**Sub-tasks:**

- [ ] Write test: verify table schema with all columns
- [ ] Write test: verify detection_point enum (4 values)
- [ ] Write test: verify grade enum (minor, major, reject)
- [ ] Write test: verify deduction formula: count _ cost _ rate%
- [ ] Write test: verify approval workflow (pending → approved/rejected)
- [ ] Write test: verify miscellaneous damage has wager_id=NULL
- [ ] Write test: verify owner approval is required before deduction
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 6.1.2: Create RLS policy for damage_records

**Sub-tasks:**

- [ ] Write test: tenant isolation
- [ ] Write test: wager can see only own damage records
- [ ] Create RLS policy
- [ ] Verify tests pass

---

### Integration Test: Epic 6

- [ ] **IT-6.1**: Production return → record damage → approve → verify deduction calculated
- [ ] **IT-6.2**: Damage at different detection points → verify all 4 points work
- [ ] **IT-6.3**: Unidentifiable damage → miscellaneous → verify no wager deduction
- [ ] **IT-6.4**: Damage with batch → verify batch traceability
- [ ] **IT-6.5**: Reject approval → verify deduction not applied
- [ ] **IT-6.6**: Verify deduction rate comes from tenant_settings at recording time (snapshot)

---

## Epic 7: Post-Production (Tailoring & Packaging)

### Story 7.1: Tailoring Records

> As an owner, I need to track tailoring (stitch + knot counts) for wage calculation and stage progression.

#### Task 7.1.1: Create `tailoring_records` table migration

| Column          | Type            | Constraints               | Notes                             |
| --------------- | --------------- | ------------------------- | --------------------------------- |
| `id`            | `uuid`          | PK                        |                                   |
| `tenant_id`     | `uuid`          | FK → tenants, NOT NULL    |                                   |
| `tailor_id`     | `uuid`          | FK → users, NOT NULL      | User with role='tailor'           |
| `batch_id`      | `uuid`          | FK → batches, NULLABLE    |                                   |
| `product_id`    | `uuid`          | FK → products, NOT NULL   |                                   |
| `color`         | `varchar(50)`   | NOT NULL                  |                                   |
| `godown_id`     | `uuid`          | FK → godowns, NOT NULL    |                                   |
| `stitch_count`  | `integer`       | NOT NULL                  |                                   |
| `knot_count`    | `integer`       | NOT NULL                  |                                   |
| `stitch_wage`   | `decimal(10,2)` | NOT NULL                  | stitch_count \* stitch_rate       |
| `knot_wage`     | `decimal(10,2)` | NOT NULL                  | knot_count \* knot_rate           |
| `total_wage`    | `decimal(10,2)` | NOT NULL                  | stitch_wage + knot_wage           |
| `work_date`     | `date`          | NOT NULL                  |                                   |
| `mismatch_flag` | `boolean`       | NOT NULL, default `false` | If counts don't match woven stock |
| `created_at`    | `timestamptz`   | NOT NULL, default `now()` |                                   |
| `updated_at`    | `timestamptz`   | NOT NULL, default `now()` |                                   |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify wage calculation: stitch_wage + knot_wage = total_wage
- [ ] Write test: verify mismatch_flag triggers when count != woven stock
- [ ] Write test: verify inventory moves woven → tailored
- [ ] Create migration file
- [ ] Run migration and verify tests pass

### Story 7.2: Packaging Records

> As an owner, I need to track packaging (bundling) for wage calculation and stage progression.

#### Task 7.2.1: Create `packaging_records` table migration

| Column              | Type                    | Constraints               | Notes                                  |
| ------------------- | ----------------------- | ------------------------- | -------------------------------------- |
| `id`                | `uuid`                  | PK                        |                                        |
| `tenant_id`         | `uuid`                  | FK → tenants, NOT NULL    |                                        |
| `packager_id`       | `uuid`                  | FK → users, NOT NULL      | User with role='packager'              |
| `batch_id`          | `uuid`                  | FK → batches, NULLABLE    |                                        |
| `product_id`        | `uuid`                  | FK → products, NOT NULL   |                                        |
| `color`             | `varchar(50)`           | NOT NULL                  |                                        |
| `godown_id`         | `uuid`                  | FK → godowns, NOT NULL    |                                        |
| `bundle_type`       | `enum('small','large')` | NOT NULL                  |                                        |
| `bundle_count`      | `integer`               | NOT NULL                  |                                        |
| `pieces_per_bundle` | `integer`               | NOT NULL                  | From product master at time of packing |
| `total_pieces`      | `integer`               | NOT NULL                  | bundle_count \* pieces_per_bundle      |
| `wage_per_bundle`   | `decimal(10,2)`         | NOT NULL                  | From product master                    |
| `total_wage`        | `decimal(10,2)`         | NOT NULL                  | bundle_count \* wage_per_bundle        |
| `pack_date`         | `date`                  | NOT NULL                  |                                        |
| `created_at`        | `timestamptz`           | NOT NULL, default `now()` |                                        |
| `updated_at`        | `timestamptz`           | NOT NULL, default `now()` |                                        |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify wage calculation: bundle_count \* wage_per_bundle = total_wage
- [ ] Write test: verify inventory moves tailored → bundled
- [ ] Write test: verify bundle_type enum
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 7.2.2: Create RLS policies for tailoring and packaging

**Sub-tasks:**

- [ ] Write test: tenant isolation on both tables
- [ ] Write test: tailor can only see own records
- [ ] Write test: packager can only see own records
- [ ] Create RLS policies
- [ ] Verify tests pass

---

### Integration Test: Epic 7

- [ ] **IT-7.1**: Woven stock → tailoring → verify stage transition and wage calc
- [ ] **IT-7.2**: Tailored stock → packaging → verify stage transition and wage calc
- [ ] **IT-7.3**: Full pipeline: woven → tailored → bundled → verify inventory at each stage
- [ ] **IT-7.4**: Mismatch detection: tailoring count vs woven stock received
- [ ] **IT-7.5**: Batch traceability through tailoring and packaging

---

## Epic 8: Wage & Advance Management

### Story 8.1: Advance Tracking

> As an owner, I need to issue and track advances given to wagers with a running balance.

#### Task 8.1.1: Create `advance_transactions` table migration

| Column             | Type                                                                | Constraints                   | Notes                          |
| ------------------ | ------------------------------------------------------------------- | ----------------------------- | ------------------------------ |
| `id`               | `uuid`                                                              | PK                            |                                |
| `tenant_id`        | `uuid`                                                              | FK → tenants, NOT NULL        |                                |
| `wager_id`         | `uuid`                                                              | FK → wager_profiles, NOT NULL |                                |
| `transaction_type` | `enum('advance_given','advance_deducted','discretionary_addition')` | NOT NULL                      |                                |
| `amount`           | `decimal(12,2)`                                                     | NOT NULL                      |                                |
| `balance_after`    | `decimal(12,2)`                                                     | NOT NULL                      | Running balance snapshot       |
| `wage_cycle_id`    | `uuid`                                                              | FK → wage_cycles, NULLABLE    | Linked wage cycle if deduction |
| `notes`            | `text`                                                              | NULLABLE                      |                                |
| `transaction_date` | `date`                                                              | NOT NULL                      |                                |
| `created_at`       | `timestamptz`                                                       | NOT NULL, default `now()`     |                                |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify transaction_type enum (3 types)
- [ ] Write test: verify balance_after tracks running balance
- [ ] Write test: verify advance_given increases balance
- [ ] Write test: verify advance_deducted decreases balance
- [ ] Write test: verify discretionary_addition (negative net payable case)
- [ ] Create migration file
- [ ] Run migration and verify tests pass

### Story 8.2: Wage Cycle Management

> As an owner, I need weekly wage cycles that auto-calculate gross wage, deductions, and net payable.

#### Task 8.2.1: Create `wage_cycles` table migration

| Column             | Type                                       | Constraints                 | Notes |
| ------------------ | ------------------------------------------ | --------------------------- | ----- |
| `id`               | `uuid`                                     | PK                          |       |
| `tenant_id`        | `uuid`                                     | FK → tenants, NOT NULL      |       |
| `cycle_start_date` | `date`                                     | NOT NULL                    |       |
| `cycle_end_date`   | `date`                                     | NOT NULL                    |       |
| `status`           | `enum('draft','review','approved','paid')` | NOT NULL, default `'draft'` |       |
| `approved_by`      | `uuid`                                     | FK → users, NULLABLE        |       |
| `approved_at`      | `timestamptz`                              | NULLABLE                    |       |
| `created_at`       | `timestamptz`                              | NOT NULL, default `now()`   |       |
| `updated_at`       | `timestamptz`                              | NOT NULL, default `now()`   |       |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify status workflow: draft → review → approved → paid
- [ ] Write test: verify cycle dates are within a week
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 8.2.2: Create `wage_records` table migration

| Column                 | Type                                             | Constraints                   | Notes                                  |
| ---------------------- | ------------------------------------------------ | ----------------------------- | -------------------------------------- |
| `id`                   | `uuid`                                           | PK                            |                                        |
| `tenant_id`            | `uuid`                                           | FK → tenants, NOT NULL        |                                        |
| `wage_cycle_id`        | `uuid`                                           | FK → wage_cycles, NOT NULL    |                                        |
| `worker_id`            | `uuid`                                           | FK → users, NOT NULL          | Wager, Tailor, Packager, or Paavu Oati |
| `worker_type`          | `enum('wager','tailor','packager','paavu_oati')` | NOT NULL                      |                                        |
| `gross_wage`           | `decimal(12,2)`                                  | NOT NULL                      | Production-based                       |
| `advance_deduction`    | `decimal(12,2)`                                  | NOT NULL, default `0`         |                                        |
| `damage_deduction`     | `decimal(12,2)`                                  | NOT NULL, default `0`         |                                        |
| `net_payable`          | `decimal(12,2)`                                  | NOT NULL                      | gross - advance - damage               |
| `discretionary_amount` | `decimal(12,2)`                                  | NOT NULL, default `0`         | Owner can pay even if net<=0           |
| `actual_paid`          | `decimal(12,2)`                                  | NOT NULL, default `0`         | What was actually paid                 |
| `payment_status`       | `enum('pending','paid')`                         | NOT NULL, default `'pending'` |                                        |
| `paid_at`              | `timestamptz`                                    | NULLABLE                      |                                        |
| `created_at`           | `timestamptz`                                    | NOT NULL, default `now()`     |                                        |
| `updated_at`           | `timestamptz`                                    | NOT NULL, default `now()`     |                                        |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: net_payable = gross_wage - advance_deduction - damage_deduction
- [ ] Write test: negative net_payable scenario → discretionary_amount handling
- [ ] Write test: discretionary_amount adds to advance_balance
- [ ] Write test: verify worker_type enum (4 types)
- [ ] Write test: verify payment workflow (pending → paid)
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 8.2.3: Create RLS policies for wage tables

**Sub-tasks:**

- [ ] Write test: tenant isolation on all wage tables
- [ ] Write test: wager/tailor/packager can see only own wage records
- [ ] Create RLS policies
- [ ] Verify tests pass

---

### Integration Test: Epic 8

- [ ] **IT-8.1**: Give advance → verify balance increases → wage cycle deduction → verify balance decreases
- [ ] **IT-8.2**: Full wage cycle: production → damage → advance deduction → net payable calculation
- [ ] **IT-8.3**: Negative net payable → owner pays discretionary → verify advance_balance increases
- [ ] **IT-8.4**: Tailor wage cycle: stitch + knot wage calculation
- [ ] **IT-8.5**: Packager wage cycle: bundle-based wage calculation
- [ ] **IT-8.6**: Paavu Oati wage cycle: paavu_count \* rate
- [ ] **IT-8.7**: Wage cycle status workflow: draft → review → approved → paid
- [ ] **IT-8.8**: Verify wager can view own wage breakdown via self-service

---

## Epic 9: Sales & Finance

### Story 9.1: Invoice Generation

> As an owner, I need to create GST-compliant invoices with automatic tax type detection.

#### Task 9.1.1: Create `invoices` table migration

| Column             | Type                                                                   | Constraints                 | Notes                             |
| ------------------ | ---------------------------------------------------------------------- | --------------------------- | --------------------------------- |
| `id`               | `uuid`                                                                 | PK                          |                                   |
| `tenant_id`        | `uuid`                                                                 | FK → tenants, NOT NULL      |                                   |
| `invoice_number`   | `varchar(50)`                                                          | NOT NULL                    | Auto-generated, unique per tenant |
| `customer_id`      | `uuid`                                                                 | FK → customers, NOT NULL    |                                   |
| `invoice_date`     | `date`                                                                 | NOT NULL                    |                                   |
| `due_date`         | `date`                                                                 | NOT NULL                    | invoice_date + credit_period      |
| `subtotal`         | `decimal(12,2)`                                                        | NOT NULL                    | Before tax                        |
| `cgst_amount`      | `decimal(10,2)`                                                        | NOT NULL, default `0`       | Intra-state                       |
| `sgst_amount`      | `decimal(10,2)`                                                        | NOT NULL, default `0`       | Intra-state                       |
| `igst_amount`      | `decimal(10,2)`                                                        | NOT NULL, default `0`       | Inter-state                       |
| `total_amount`     | `decimal(12,2)`                                                        | NOT NULL                    | subtotal + tax                    |
| `amount_paid`      | `decimal(12,2)`                                                        | NOT NULL, default `0`       | Running paid amount               |
| `balance_due`      | `decimal(12,2)`                                                        | NOT NULL                    | total_amount - amount_paid        |
| `tax_type`         | `enum('intra_state','inter_state')`                                    | NOT NULL                    | Auto-detected                     |
| `status`           | `enum('draft','issued','partially_paid','paid','overdue','cancelled')` | NOT NULL, default `'draft'` |                                   |
| `eway_bill_number` | `varchar(50)`                                                          | NULLABLE                    | Optional E-way bill               |
| `notes`            | `text`                                                                 | NULLABLE                    |                                   |
| `created_at`       | `timestamptz`                                                          | NOT NULL, default `now()`   |                                   |
| `updated_at`       | `timestamptz`                                                          | NOT NULL, default `now()`   |                                   |

**Unique constraint:** `(tenant_id, invoice_number)`

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify invoice_number unique per tenant
- [ ] Write test: verify tax_type auto-detection (compare tenant state vs customer state)
- [ ] Write test: intra-state → CGST + SGST (each = GST rate / 2)
- [ ] Write test: inter-state → IGST (= full GST rate)
- [ ] Write test: verify due_date calculation
- [ ] Write test: verify status enum (6 values)
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 9.1.2: Create `invoice_items` table migration

| Column         | Type            | Constraints               | Notes                  |
| -------------- | --------------- | ------------------------- | ---------------------- |
| `id`           | `uuid`          | PK                        |                        |
| `tenant_id`    | `uuid`          | FK → tenants, NOT NULL    |                        |
| `invoice_id`   | `uuid`          | FK → invoices, NOT NULL   |                        |
| `product_id`   | `uuid`          | FK → products, NOT NULL   |                        |
| `batch_id`     | `uuid`          | FK → batches, NULLABLE    |                        |
| `color`        | `varchar(50)`   | NOT NULL                  |                        |
| `quantity`     | `integer`       | NOT NULL                  | Pieces sold            |
| `unit_price`   | `decimal(10,2)` | NOT NULL                  | Per piece              |
| `line_total`   | `decimal(12,2)` | NOT NULL                  | quantity \* unit_price |
| `gst_rate_pct` | `decimal(5,2)`  | NOT NULL                  | Snapshot from product  |
| `hsn_code`     | `varchar(20)`   | NULLABLE                  |                        |
| `created_at`   | `timestamptz`   | NOT NULL, default `now()` |                        |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify line_total = quantity \* unit_price
- [ ] Write test: verify GST rate is snapshot from product at invoice time
- [ ] Create migration file
- [ ] Run migration and verify tests pass

### Story 9.2: Payment Tracking

> As an owner, I need to record payments against invoices with partial payment support.

#### Task 9.2.1: Create `payments` table migration

| Column             | Type                                                  | Constraints               | Notes                     |
| ------------------ | ----------------------------------------------------- | ------------------------- | ------------------------- |
| `id`               | `uuid`                                                | PK                        |                           |
| `tenant_id`        | `uuid`                                                | FK → tenants, NOT NULL    |                           |
| `customer_id`      | `uuid`                                                | FK → customers, NOT NULL  |                           |
| `invoice_id`       | `uuid`                                                | FK → invoices, NULLABLE   | NULL for general payments |
| `amount`           | `decimal(12,2)`                                       | NOT NULL                  |                           |
| `payment_method`   | `enum('cash','bank_transfer','cheque','upi','other')` | NOT NULL                  |                           |
| `payment_date`     | `date`                                                | NOT NULL                  |                           |
| `reference_number` | `varchar(100)`                                        | NULLABLE                  | Cheque no, UPI ref, etc.  |
| `notes`            | `text`                                                | NULLABLE                  |                           |
| `created_at`       | `timestamptz`                                         | NOT NULL, default `now()` |                           |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify payment updates invoice amount_paid and balance_due
- [ ] Write test: verify payment updates customer outstanding_balance
- [ ] Write test: verify partial payment (amount < balance_due)
- [ ] Write test: verify full payment (amount = balance_due → status='paid')
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 9.2.2: Create RLS policies for sales tables

**Sub-tasks:**

- [ ] Write test: tenant isolation on invoices, invoice_items, payments
- [ ] Create RLS policies
- [ ] Verify tests pass

---

### Integration Test: Epic 9

- [ ] **IT-9.1**: Create invoice → verify tax_type auto-detection → verify GST split
- [ ] **IT-9.2**: Invoice with multiple items → verify subtotal and total calculations
- [ ] **IT-9.3**: Partial payment → verify balance tracking → full payment → status=paid
- [ ] **IT-9.4**: Customer outstanding_balance updated on invoice + payment
- [ ] **IT-9.5**: Overdue detection: invoice past due_date with balance > 0
- [ ] **IT-9.6**: Color pricing Mode 1 (average) vs Mode 2 (per-color) in invoice items
- [ ] **IT-9.7**: Inventory moves to sold stage on invoice dispatch

---

## Epic 10: Notifications & Alerts

### Story 10.1: Notification System

> As a system, I need to store and deliver notifications to users based on business events.

#### Task 10.1.1: Create `notifications` table migration

| Column       | Type                          | Constraints                  | Notes                                              |
| ------------ | ----------------------------- | ---------------------------- | -------------------------------------------------- |
| `id`         | `uuid`                        | PK                           |                                                    |
| `tenant_id`  | `uuid`                        | FK → tenants, NOT NULL       |                                                    |
| `user_id`    | `uuid`                        | FK → users, NOT NULL         | Recipient                                          |
| `event_type` | `varchar(50)`                 | NOT NULL                     | e.g., 'credit_due', 'wage_ready', 'damage_pending' |
| `title`      | `varchar(255)`                | NOT NULL                     | Translation key                                    |
| `body`       | `text`                        | NOT NULL                     | Translation key with params                        |
| `priority`   | `enum('low','medium','high')` | NOT NULL, default `'medium'` |                                                    |
| `is_read`    | `boolean`                     | NOT NULL, default `false`    |                                                    |
| `read_at`    | `timestamptz`                 | NULLABLE                     |                                                    |
| `data`       | `jsonb`                       | NULLABLE                     | Extra context (IDs, amounts, etc.)                 |
| `created_at` | `timestamptz`                 | NOT NULL, default `now()`    |                                                    |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify priority enum
- [ ] Write test: verify read/unread workflow
- [ ] Create migration file
- [ ] Run migration and verify tests pass

### Story 10.2: Fraud/Anomaly Alerts

> As a system, I need to log fraud detection alerts for owner review.

#### Task 10.2.1: Create `fraud_alerts` table migration

| Column        | Type                                                                                                                                      | Constraints               | Notes                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------ |
| `id`          | `uuid`                                                                                                                                    | PK                        |                          |
| `tenant_id`   | `uuid`                                                                                                                                    | FK → tenants, NOT NULL    |                          |
| `alert_type`  | `enum('color_substitution','excess_wastage','underproduction','high_damage','loom_inefficiency','inventory_mismatch','customer_overdue')` | NOT NULL                  |                          |
| `severity`    | `enum('warning','critical')`                                                                                                              | NOT NULL                  |                          |
| `entity_type` | `varchar(50)`                                                                                                                             | NOT NULL                  | What entity triggered it |
| `entity_id`   | `uuid`                                                                                                                                    | NOT NULL                  |                          |
| `details`     | `jsonb`                                                                                                                                   | NOT NULL                  | Alert specifics          |
| `is_resolved` | `boolean`                                                                                                                                 | NOT NULL, default `false` |                          |
| `resolved_by` | `uuid`                                                                                                                                    | FK → users, NULLABLE      |                          |
| `resolved_at` | `timestamptz`                                                                                                                             | NULLABLE                  |                          |
| `created_at`  | `timestamptz`                                                                                                                             | NOT NULL, default `now()` |                          |

**Sub-tasks:**

- [ ] Write test: verify table schema
- [ ] Write test: verify all 7 alert_type enum values match spec
- [ ] Write test: verify resolve workflow
- [ ] Create migration file
- [ ] Run migration and verify tests pass

#### Task 10.2.2: Create RLS policies for notifications and alerts

**Sub-tasks:**

- [ ] Write test: tenant isolation
- [ ] Write test: users can only see own notifications
- [ ] Write test: fraud_alerts only visible to owner and authorized staff
- [ ] Create RLS policies
- [ ] Verify tests pass

---

### Integration Test: Epic 10

- [ ] **IT-10.1**: Business event → notification created → user reads → mark as read
- [ ] **IT-10.2**: Anomaly detected → fraud_alert created → owner resolves
- [ ] **IT-10.3**: Notification priority routing matches spec event table
- [ ] **IT-10.4**: Verify all 11 notification events from spec are triggerable

---

## Epic 11: Indexes & Performance Optimization

### Story 11.1: Create Performance Indexes

> As a system, I need proper indexes for common query patterns across all tables.

#### Task 11.1.1: Create indexes migration

**Indexes to create:**

- `idx_users_tenant_phone` on `users(tenant_id, phone)`
- `idx_users_tenant_role` on `users(tenant_id, role)`
- `idx_inventory_dimensions` on `inventory(tenant_id, godown_id, product_id, color, stage, batch_id)`
- `idx_inventory_stage` on `inventory(tenant_id, stage)`
- `idx_production_returns_wager` on `production_returns(tenant_id, wager_id, return_date)`
- `idx_production_returns_batch` on `production_returns(tenant_id, batch_id)` WHERE batch_id IS NOT NULL
- `idx_cone_issuances_wager` on `cone_issuances(tenant_id, wager_id)`
- `idx_damage_records_wager` on `damage_records(tenant_id, wager_id)`
- `idx_damage_records_approval` on `damage_records(tenant_id, approval_status)`
- `idx_wage_records_cycle` on `wage_records(tenant_id, wage_cycle_id)`
- `idx_wage_records_worker` on `wage_records(tenant_id, worker_id)`
- `idx_invoices_customer` on `invoices(tenant_id, customer_id)`
- `idx_invoices_status` on `invoices(tenant_id, status)`
- `idx_invoices_due_date` on `invoices(tenant_id, due_date)` WHERE status != 'paid'
- `idx_payments_customer` on `payments(tenant_id, customer_id)`
- `idx_payments_invoice` on `payments(tenant_id, invoice_id)`
- `idx_notifications_user_unread` on `notifications(tenant_id, user_id)` WHERE is_read = false
- `idx_fraud_alerts_unresolved` on `fraud_alerts(tenant_id)` WHERE is_resolved = false
- `idx_batches_tenant_status` on `batches(tenant_id, status)`
- `idx_loom_downtimes_loom` on `loom_downtimes(tenant_id, loom_id)`
- `idx_audit_logs_entity` on `audit_logs(tenant_id, entity_type, entity_id)`

**Sub-tasks:**

- [ ] Write test: verify each index exists after migration
- [ ] Write test: EXPLAIN ANALYZE on key queries to verify index usage
- [ ] Create migration file
- [ ] Run migration and verify tests pass

---

### Integration Test: Epic 11

- [ ] **IT-11.1**: Run representative queries → verify they use indexes (EXPLAIN ANALYZE)
- [ ] **IT-11.2**: Verify no sequential scans on large table queries

---

## Spec Validation Matrix

| Spec Section                             | DB Tables Covering It                                         | Status             |
| ---------------------------------------- | ------------------------------------------------------------- | ------------------ |
| Multi-Tenancy (tenant_id on every table) | All tables                                                    | Covered            |
| Authentication (OTP + PIN)               | users, otp_codes, tenant_settings                             | Covered            |
| User Roles (6 roles)                     | users.role enum                                               | Covered            |
| Staff Permissions                        | staff_permissions                                             | Covered            |
| Loom Types (3+)                          | loom_types                                                    | Covered            |
| Looms (individual)                       | looms                                                         | Covered            |
| Product Master (all fields)              | products                                                      | Covered            |
| Color Pricing (Mode 1 & 2)               | products.color_pricing_mode, product_color_prices             | Covered            |
| Wager Types (1-4)                        | wager_profiles.wager_type                                     | Covered            |
| Batch System (optional)                  | batches, batch_id nullable on related tables                  | Covered            |
| Cone Purchase                            | cone_purchases                                                | Covered            |
| Wastage Rules                            | paavu_productions.wastage, production_returns.wastage         | Covered            |
| 6-Stage Inventory                        | inventory.stage enum                                          | Covered            |
| Inventory Dimensions                     | inventory unique constraint                                   | Covered            |
| Paavu Pattarai                           | paavu_productions                                             | Covered            |
| Production Returns                       | production_returns (weight + count)                           | Covered            |
| Damage Grading (Minor/Major/Reject)      | damage_records.grade                                          | Covered            |
| Damage Approval                          | damage_records.approval_status                                | Covered            |
| Damage Traceability                      | damage_records → production_returns → wager                   | Covered            |
| Miscellaneous Damage                     | damage_records.is_miscellaneous                               | Covered            |
| Tailoring (stitch + knot)                | tailoring_records                                             | Covered            |
| Packaging (small + large bundles)        | packaging_records                                             | Covered            |
| Advance System                           | advance_transactions, wager_profiles.advance_balance          | Covered            |
| Wage Calculation Formula                 | wage_records (gross - advance - damage = net)                 | Covered            |
| Negative Balance Handling                | wage_records.discretionary_amount                             | Covered            |
| Configurable Wage Cycle Day              | tenant_settings.wage_cycle_day                                | Covered            |
| Shift Tracking (optional)                | shifts, shift_wage_rates, production_returns.shift            | Covered            |
| Loom Capacity                            | loom_types.capacity_pieces_per_day                            | Covered            |
| Downtime Recording                       | loom_downtimes                                                | Covered            |
| Performance Ranking                      | Calculated from production_returns + loom_types               | Covered (computed) |
| GST (CGST/SGST vs IGST)                  | invoices (cgst, sgst, igst), tax_type                         | Covered            |
| Credit Period                            | customers.credit_period_days                                  | Covered            |
| Partial & Bill-to-Bill Payment           | payments, invoices.amount_paid                                | Covered            |
| Customer Types (3)                       | customers.customer_type                                       | Covered            |
| E-way Bill                               | invoices.eway_bill_number                                     | Covered            |
| Multi-Godown                             | godowns                                                       | Covered            |
| Inter-Godown Transfers                   | inter_godown_transfers                                        | Covered            |
| Notifications (In-App)                   | notifications                                                 | Covered            |
| Fraud Detection (7 alert types)          | fraud_alerts.alert_type                                       | Covered            |
| Audit Logging                            | audit_logs                                                    | Covered            |
| i18n                                     | notifications.title/body use translation keys, users.language | Covered            |
| Soft Deletes                             | is_active flags on master tables                              | Covered            |
| RLS Policies                             | Every table has tenant isolation RLS                          | Covered            |

---

## Table Count Summary

| Category        | Tables                                                                                                             | Count  |
| --------------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| Foundation      | tenants, tenant_settings, users, staff_permissions, otp_codes, audit_logs                                          | 6      |
| Master Data     | loom_types, looms, products, product_color_prices, shift_wage_rates, suppliers, customers, godowns, wager_profiles | 9      |
| Batch           | batches                                                                                                            | 1      |
| Inventory       | inventory, inventory_movements, inter_godown_transfers, cone_purchases                                             | 4      |
| Production      | cone_issuances, paavu_productions, production_returns, loom_downtimes, shifts                                      | 5      |
| Damage          | damage_records                                                                                                     | 1      |
| Post-Production | tailoring_records, packaging_records                                                                               | 2      |
| Wage & Advance  | advance_transactions, wage_cycles, wage_records                                                                    | 3      |
| Sales & Finance | invoices, invoice_items, payments                                                                                  | 3      |
| Notifications   | notifications, fraud_alerts                                                                                        | 2      |
| **Total**       |                                                                                                                    | **36** |

---

## Migration Execution Order

Migrations must respect FK dependencies:

1. `001_create_tenants.sql`
2. `002_create_tenant_settings.sql`
3. `003_create_users.sql`
4. `004_create_staff_permissions.sql`
5. `005_create_otp_codes.sql`
6. `006_create_audit_logs.sql`
7. `007_create_loom_types.sql`
8. `008_create_looms.sql`
9. `009_create_products.sql`
10. `010_create_product_color_prices.sql`
11. `011_create_shift_wage_rates.sql`
12. `012_create_suppliers.sql`
13. `013_create_customers.sql`
14. `014_create_godowns.sql`
15. `015_create_wager_profiles.sql`
16. `016_create_batches.sql`
17. `017_create_cone_purchases.sql`
18. `018_create_inventory.sql`
19. `019_create_inventory_movements.sql`
20. `020_create_inter_godown_transfers.sql`
21. `021_create_cone_issuances.sql`
22. `022_create_shifts.sql`
23. `023_create_paavu_productions.sql`
24. `024_create_production_returns.sql`
25. `025_create_loom_downtimes.sql`
26. `026_create_damage_records.sql`
27. `027_create_tailoring_records.sql`
28. `028_create_packaging_records.sql`
29. `029_create_wage_cycles.sql`
30. `030_create_wage_records.sql`
31. `031_create_advance_transactions.sql`
32. `032_create_invoices.sql`
33. `033_create_invoice_items.sql`
34. `034_create_payments.sql`
35. `035_create_notifications.sql`
36. `036_create_fraud_alerts.sql`
37. `037_create_indexes.sql`
38. `038_create_rls_policies.sql`
39. `039_create_triggers.sql` (updated_at trigger)

---

## Testing Strategy Summary

| Test Type                    | Count | Scope                                            |
| ---------------------------- | ----- | ------------------------------------------------ |
| Unit Tests (per sub-task)    | ~150+ | Individual table schema, constraints, defaults   |
| Integration Tests (per epic) | ~50+  | Cross-table relationships, business logic chains |
| RLS Tests                    | ~20+  | Tenant isolation, role-based visibility          |
| Performance Tests            | ~10+  | Index verification, query plan validation        |

**TDD Cycle for each migration:**

1. RED: Write test asserting table/column/constraint exists → test fails (table doesn't exist)
2. GREEN: Create migration → run → test passes
3. REFACTOR: Optimize column types, add comments, verify naming conventions
