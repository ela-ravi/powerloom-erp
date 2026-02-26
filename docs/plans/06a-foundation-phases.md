# Foundation Phases — Powerloom ERP V3

> Phases 0, 1, 2 of the implementation guide. Covers project setup, middleware, tenant/user/auth foundation, and all master data.

**Parent document:** [06-implementation-guide.md](./06-implementation-guide.md)

---

## Phase 0: Project Setup & Middleware

> **Dependencies:** None | **BE Epic:** 1 (Stories 1.1-1.3) | **CL-BE-01:** Items 1.1-1.10 | **Endpoints:** 1 (`GET /api/health`) | **DB Tables:** None | **Tests:** ~25 unit

### Overview

Phase 0 bootstraps the entire backend. It delivers the Express app, all middleware (auth, tenant isolation, validation, error handling, logging), the base repository pattern, transaction wrapper, audit service, and the health check endpoint. No database tables are created in this phase -- only the infrastructure that every subsequent phase depends on.

This phase produces zero business logic but is the foundation for everything. By the end, you have a running server with a middleware stack that enforces authentication, tenant isolation, role authorization, request validation, structured error responses, and audit logging.

### DB Tables

None. Phase 0 is middleware-only.

### Skills to Invoke

| Order | Command                                 | Purpose                                                        | CL-BE Ref             |
| ----- | --------------------------------------- | -------------------------------------------------------------- | --------------------- |
| 1     | `/generate-test middleware unit`        | RED: Write failing tests for all middleware                    | CL-BE-01.2-1.7        |
| 2     | `/scaffold-module auth`                 | GREEN: Scaffold auth module with JWT, roles, tenant scope      | CL-BE-01.2-1.5        |
| 3     | `/api-endpoint GET /api/health`         | GREEN: Create health check endpoint                            | CL-BE-01.1            |
| 4     | `/generate-test shared unit`            | RED: Write tests for base repository, transaction, audit       | CL-BE-01.8-1.10       |
| 5     | `/scaffold-module shared`               | GREEN: Implement BaseRepository, withTransaction, AuditService | CL-BE-01.8-1.10       |
| 6     | `/generate-test middleware integration` | RED: Write integration tests for middleware chain              | IT-1.1 through IT-1.6 |

### Agent Activation Flow

- **Proactive:** `test-runner` (A5) -- triggers after every code change; runs unit tests automatically
- **Proactive:** `business-logic-validator` (A3) -- triggers when service files are created; validates middleware logic
- **Manual:** `domain-expert` (A2) -- invoke if unclear on role hierarchy or permission model
- **Manual:** `checklist-validator` (A6) -- invoke after phase completion to confirm CL-BE-01 coverage

### TDD Steps

#### RED -- Write Failing Tests

Write tests for all 10 CL-BE-01 items before any implementation:

```bash
# 1. Health check endpoint
/generate-test health unit
# Test: GET /api/health returns 200 with { status: 'ok', timestamp }

# 2. Error handler middleware
/generate-test error-handler unit
# Tests:
#   - Validation error returns 400 with { error: { code: 'VALIDATION_ERROR', message, details[] } }
#   - Auth error returns 401 with { error: { code: 'UNAUTHORIZED', message } }
#   - Forbidden returns 403
#   - Not found returns 404
#   - Internal error returns 500 without leaking stack trace
#   - AppError class creates structured errors

# 3. Request validation middleware
/generate-test validate unit
# Tests:
#   - Valid request body passes through
#   - Invalid body returns 400 with field-level details
#   - Valid query params pass through
#   - Invalid query params return 400
#   - Zod schema rejects unknown fields (strict mode)

# 4. Authentication middleware
/generate-test authenticate unit
# Tests:
#   - Request without Authorization header returns 401
#   - Request with malformed token returns 401
#   - Request with expired token returns 401
#   - Request with valid token sets req.user { id, tenantId, role }
#   - Token generation includes tenantId, userId, role claims
#   - Token refresh returns new access token

# 5. Tenant isolation middleware
/generate-test tenant-scope unit
# Tests:
#   - Sets app.current_tenant in DB session from req.user.tenantId
#   - Super admin can specify tenant via X-Tenant-Id header
#   - Non-super-admin cannot override tenant via header
#   - Missing tenant context returns 500

# 6. Role authorization middleware
/generate-test authorize unit
# Tests:
#   - Owner can access owner-only routes
#   - Wager cannot access owner-only routes (403)
#   - Staff with 'production_entry' permission can access production routes
#   - Staff without permission gets 403
#   - authorize('owner', 'staff') allows both roles
#   - requirePermission('godown_management') checks staff_permissions table

# 7. Request logger middleware
/generate-test request-logger unit
# Tests:
#   - Logs method, path, status code, response time in ms
#   - Does not log sensitive fields (Authorization header, PIN)
#   - Structured log format (JSON via pino)

# 8. Base repository
/generate-test base-repository unit
# Tests:
#   - findById(id) returns record scoped to tenant
#   - findById(id) returns null for different tenant's record
#   - create(data) auto-sets tenant_id from context
#   - update(id, data) only updates own tenant's record
#   - softDelete(id) sets is_active = false
#   - findAll({ limit, offset }) returns paginated results
#   - findAll with filters works correctly

# 9. Transaction wrapper
/generate-test transaction unit
# Tests:
#   - withTransaction commits on success
#   - withTransaction rolls back on thrown error
#   - Nested transactions use savepoints

# 10. Audit service
/generate-test audit-service unit
# Tests:
#   - create action logs entity_type, entity_id, new_values
#   - update action logs old_values and new_values
#   - delete action logs old_values
#   - Audit log includes tenant_id and user_id from context
```

Run all tests -- they **MUST** all fail:

```bash
pnpm test -- --run src/middleware/__tests__/*.unit.test.ts
pnpm test -- --run src/shared/__tests__/*.unit.test.ts
pnpm test -- --run src/modules/health/__tests__/*.unit.test.ts
```

#### GREEN -- Implement

```bash
# 1. Scaffold Express app, config, and middleware
/scaffold-module auth

# Creates:
#   src/app.ts                       - Express setup with middleware chain
#   src/server.ts                    - Server entry, graceful shutdown
#   src/config/env.ts                - Zod-validated environment variables
#   src/config/database.ts           - PostgreSQL connection pool
#   src/config/logger.ts             - Pino structured logger
#   src/middleware/errorHandler.ts   - Global error handler + AppError class
#   src/middleware/validate.ts       - Zod validation middleware factory
#   src/middleware/authenticate.ts   - JWT verification middleware
#   src/middleware/tenantScope.ts    - RLS tenant context middleware
#   src/middleware/authorize.ts      - Role + permission middleware
#   src/middleware/requestLogger.ts  - Request logging middleware
#   src/shared/errors.ts             - AppError class, error codes enum

# 2. Health check
/api-endpoint GET /api/health

# 3. Base infrastructure
#   src/shared/base.repository.ts   - BaseRepository<T> with tenant-scoped CRUD
#   src/shared/transaction.ts        - withTransaction() wrapper
#   src/shared/audit.service.ts      - AuditService.log()

# 4. Shared types
#   src/types/enums.ts               - UserRole, TenantStatus, Permission enums
#   src/types/models.ts              - Base model interfaces
#   src/types/api.ts                 - Request/response types, pagination
```

Run all tests -- they **MUST** all pass:

```bash
pnpm test -- --run
```

#### REFACTOR

- Extract common Zod schemas (uuid, phone, pagination) into `src/shared/schemas.ts`
- Ensure `snake_case` DB naming and `camelCase` TypeScript naming conventions
- Add i18n keys for error messages:
  ```bash
  /add-translation error.unauthorized "Unauthorized access" "அங்கீகரிக்கப்படாத அணுகல்"
  /add-translation error.forbidden "Access denied" "அணுகல் மறுக்கப்பட்டது"
  /add-translation error.validation "Validation failed" "சரிபார்ப்பு தோல்வி"
  /add-translation error.not_found "Resource not found" "வளம் கிடைக்கவில்லை"
  /add-translation error.internal "Internal server error" "உள் சேவையக பிழை"
  ```
- Verify TypeScript strict mode: `pnpm tsc --noEmit`
- Run linter: `pnpm lint`

### Curl Commands

See [06e-curl-reference.md, Phase 0 section](./06e-curl-reference.md#phase-0-project-setup--middleware).

```bash
# Health check
curl -s http://localhost:3000/api/health | jq
# Expected: { "status": "ok", "timestamp": "..." }

# Unauthenticated request (should fail)
curl -s -w "\n%{http_code}" http://localhost:3000/api/tenants
# Expected: 401

# Invalid token
curl -s -H "Authorization: Bearer invalid-token" http://localhost:3000/api/tenants
# Expected: 401
```

### Integration Tests

| Test ID | Description                                                         | What It Validates                 |
| ------- | ------------------------------------------------------------------- | --------------------------------- |
| IT-1.1  | Server starts, health check returns 200                             | Express app boots, routing works  |
| IT-1.2  | Unauthenticated request returns 401, authenticated returns 200      | Auth middleware chain             |
| IT-1.3  | Tenant A user cannot access Tenant B data                           | Tenant isolation via RLS          |
| IT-1.4  | Staff without permission gets 403 on restricted route               | Permission middleware             |
| IT-1.5  | Error handler formats validation, auth, and server errors correctly | Error response format consistency |
| IT-1.6  | Database transaction rolls back on partial failure                  | Transaction wrapper atomicity     |

### Verification Gate

- [ ] All unit tests pass (`pnpm test -- --run`)
- [ ] All 6 integration tests pass (IT-1.1 through IT-1.6)
- [ ] `GET /api/health` returns 200 via curl
- [ ] Unauthenticated requests return 401
- [ ] `business-logic-validator` approved middleware logic
- [ ] `checklist-validator` confirmed: CL-BE-01 items 1.1-1.10 complete (10/10)
- [ ] i18n keys added for all error messages
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint warnings (`pnpm lint`)
- [ ] Test utilities created: `createTestTenant()`, `createTestUser()`, `getAuthToken()`, `cleanupTestData()`

---

## Phase 1: Foundation -- Tenants, Users, Auth

> **Dependencies:** Phase 0 | **DB Epic:** 1 | **BE Epics:** 1, 2, 3 | **CL-DB-01:** 11 items, **CL-DB-02:** 10 items, **CL-DB-16:** partial (16.1-16.3, 16.6) | **CL-BE-02:** 10 items, **CL-BE-03:** 8 items | **Endpoints:** 20 | **DB Tables:** 6 | **Tests:** ~75 unit, ~10 integration
>
> **MILESTONE PHASE** -- `devils-advocate` (A7) reviews after completion

### Overview

Phase 1 creates the six foundational database tables and all authentication and user management endpoints. This is the most critical phase because it establishes multi-tenancy, authentication, and authorization -- the security backbone of the entire system.

After Phase 1, you can:

- Create tenants with configurable settings
- Authenticate users via Phone OTP or 4-digit PIN
- Manage users with role-based access
- Assign granular permissions to staff
- Enforce tenant isolation at the database level via RLS

This phase is a **milestone** -- the `devils-advocate` agent stress-tests the security design, tenant isolation, and auth flows before proceeding.

### DB Tables

#### `tenants`

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

#### `tenant_settings`

| Column                          | Type           | Constraints                | Notes                       |
| ------------------------------- | -------------- | -------------------------- | --------------------------- |
| `id`                            | `uuid`         | PK                         |                             |
| `tenant_id`                     | `uuid`         | FK -> tenants, UNIQUE      | One settings row per tenant |
| `batch_enabled`                 | `boolean`      | NOT NULL, default `false`  | Batch system toggle         |
| `shift_enabled`                 | `boolean`      | NOT NULL, default `false`  | Shift tracking toggle       |
| `inter_godown_transfer_enabled` | `boolean`      | NOT NULL, default `false`  |                             |
| `auth_otp_enabled`              | `boolean`      | NOT NULL, default `true`   | Phone OTP auth              |
| `auth_pin_enabled`              | `boolean`      | NOT NULL, default `false`  | 4-digit PIN auth            |
| `wage_cycle_day`                | `smallint`     | NOT NULL, default `0`      | 0=Sunday...6=Saturday       |
| `default_credit_period_days`    | `integer`      | NOT NULL, default `30`     |                             |
| `paavu_wastage_limit_grams`     | `integer`      | NOT NULL, default `500`    |                             |
| `damage_minor_deduction_pct`    | `decimal(5,2)` | NOT NULL, default `25.00`  | Minor grade %               |
| `damage_major_deduction_pct`    | `decimal(5,2)` | NOT NULL, default `50.00`  | Major grade %               |
| `damage_reject_deduction_pct`   | `decimal(5,2)` | NOT NULL, default `100.00` | Reject grade %              |
| `show_wager_ranking`            | `boolean`      | NOT NULL, default `false`  |                             |
| `currency`                      | `varchar(3)`   | NOT NULL, default `'INR'`  |                             |
| `locale`                        | `varchar(10)`  | NOT NULL, default `'en'`   |                             |
| `created_at`                    | `timestamptz`  | NOT NULL, default `now()`  |                             |
| `updated_at`                    | `timestamptz`  | NOT NULL, default `now()`  |                             |

#### `users`

| Column          | Type                                                              | Constraints               | Notes              |
| --------------- | ----------------------------------------------------------------- | ------------------------- | ------------------ |
| `id`            | `uuid`                                                            | PK                        |                    |
| `tenant_id`     | `uuid`                                                            | FK -> tenants, NOT NULL   |                    |
| `phone`         | `varchar(15)`                                                     | NOT NULL                  |                    |
| `name`          | `varchar(255)`                                                    | NOT NULL                  |                    |
| `role`          | `enum('super_admin','owner','staff','wager','tailor','packager')` | NOT NULL                  |                    |
| `pin_hash`      | `varchar(255)`                                                    | NULLABLE                  | Hashed 4-digit PIN |
| `language`      | `varchar(5)`                                                      | NOT NULL, default `'en'`  |                    |
| `is_active`     | `boolean`                                                         | NOT NULL, default `true`  |                    |
| `last_login_at` | `timestamptz`                                                     | NULLABLE                  |                    |
| `created_at`    | `timestamptz`                                                     | NOT NULL, default `now()` |                    |
| `updated_at`    | `timestamptz`                                                     | NOT NULL, default `now()` |                    |

**Unique constraint:** `(tenant_id, phone)`

#### `staff_permissions`

| Column       | Type          | Constraints               | Notes                                                                                                                            |
| ------------ | ------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | `uuid`        | PK                        |                                                                                                                                  |
| `tenant_id`  | `uuid`        | FK -> tenants, NOT NULL   |                                                                                                                                  |
| `user_id`    | `uuid`        | FK -> users, NOT NULL     |                                                                                                                                  |
| `permission` | `varchar(50)` | NOT NULL                  | e.g., 'godown_management', 'production_entry', 'wage_processing', 'sales_invoicing', 'reports', 'damage_approval', 'master_data' |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |                                                                                                                                  |

**Unique constraint:** `(user_id, permission)`

#### `otp_codes`

| Column       | Type          | Constraints               | Notes           |
| ------------ | ------------- | ------------------------- | --------------- |
| `id`         | `uuid`        | PK                        |                 |
| `phone`      | `varchar(15)` | NOT NULL                  |                 |
| `code`       | `varchar(6)`  | NOT NULL                  | Hashed OTP code |
| `expires_at` | `timestamptz` | NOT NULL                  |                 |
| `verified`   | `boolean`     | NOT NULL, default `false` |                 |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |                 |

#### `audit_logs`

| Column        | Type          | Constraints               | Notes                                   |
| ------------- | ------------- | ------------------------- | --------------------------------------- |
| `id`          | `uuid`        | PK                        |                                         |
| `tenant_id`   | `uuid`        | FK -> tenants, NOT NULL   |                                         |
| `user_id`     | `uuid`        | FK -> users, NULLABLE     | System actions may not have user        |
| `action`      | `varchar(50)` | NOT NULL                  | 'create', 'update', 'delete', 'approve' |
| `entity_type` | `varchar(50)` | NOT NULL                  | Table/entity name                       |
| `entity_id`   | `uuid`        | NOT NULL                  | Row ID                                  |
| `old_values`  | `jsonb`       | NULLABLE                  | Previous state                          |
| `new_values`  | `jsonb`       | NULLABLE                  | New state                               |
| `created_at`  | `timestamptz` | NOT NULL, default `now()` |                                         |

### Endpoints (20)

#### Auth (6 endpoints)

| Method | Path                   | Purpose                                  | Auth          | CL-BE Ref       |
| ------ | ---------------------- | ---------------------------------------- | ------------- | --------------- |
| `POST` | `/api/auth/otp/send`   | Send OTP to phone number                 | Public        | CL-BE-02.1      |
| `POST` | `/api/auth/otp/verify` | Verify OTP, return JWT                   | Public        | CL-BE-02.2      |
| `POST` | `/api/auth/pin/verify` | Verify PIN, return JWT                   | Public        | CL-BE-02.3      |
| `PUT`  | `/api/auth/pin`        | Set or update 4-digit PIN                | Authenticated | CL-BE-02.4      |
| `POST` | `/api/auth/refresh`    | Refresh access token                     | Refresh token | CL-BE-02.9      |
| `GET`  | `/api/auth/me`         | Get current user profile + feature flags | Authenticated | CL-BE-02.7, 2.8 |

#### Tenants (5 endpoints)

| Method | Path                      | Purpose                               | Auth                | CL-BE Ref  |
| ------ | ------------------------- | ------------------------------------- | ------------------- | ---------- |
| `POST` | `/api/tenants`            | Create tenant (auto-creates settings) | Super Admin         | CL-BE-03.1 |
| `GET`  | `/api/tenants`            | List tenants (paginated)              | Super Admin         | CL-BE-03.1 |
| `GET`  | `/api/tenants/:id`        | Get tenant details                    | Super Admin / Owner | CL-BE-03.1 |
| `PUT`  | `/api/tenants/:id`        | Update tenant                         | Super Admin / Owner | CL-BE-03.1 |
| `PUT`  | `/api/tenants/:id/status` | Update tenant status                  | Super Admin         | CL-BE-03.2 |

#### Tenant Settings (2 endpoints)

| Method | Path                        | Purpose                | Auth  | CL-BE Ref  |
| ------ | --------------------------- | ---------------------- | ----- | ---------- |
| `GET`  | `/api/tenants/:id/settings` | Get tenant settings    | Owner | CL-BE-03.3 |
| `PUT`  | `/api/tenants/:id/settings` | Update tenant settings | Owner | CL-BE-03.3 |

#### Users (5 endpoints)

| Method | Path                        | Purpose                                                 | Auth                       | CL-BE Ref            |
| ------ | --------------------------- | ------------------------------------------------------- | -------------------------- | -------------------- |
| `POST` | `/api/users`                | Create user (auto-creates wager_profile for wager role) | Owner / Staff(master_data) | CL-BE-03.4, 3.5, 3.6 |
| `GET`  | `/api/users`                | List users (paginated, filterable by role)              | Owner / Staff              | CL-BE-03.4           |
| `GET`  | `/api/users/:id`            | Get user details                                        | Owner / Staff / Self       | CL-BE-03.4           |
| `PUT`  | `/api/users/:id`            | Update user                                             | Owner / Staff(master_data) | CL-BE-03.4           |
| `PUT`  | `/api/users/:id/deactivate` | Soft deactivate user                                    | Owner                      | CL-BE-03.8           |

#### Staff Permissions (2 endpoints)

| Method | Path                         | Purpose                       | Auth  | CL-BE Ref  |
| ------ | ---------------------------- | ----------------------------- | ----- | ---------- |
| `GET`  | `/api/users/:id/permissions` | Get staff permissions         | Owner | CL-BE-03.7 |
| `PUT`  | `/api/users/:id/permissions` | Set permissions (replace all) | Owner | CL-BE-03.7 |

### Skills to Invoke

| Order | Command                              | Purpose                                              | CL Ref                  |
| ----- | ------------------------------------ | ---------------------------------------------------- | ----------------------- |
| 1     | `/generate-test tenants unit`        | RED: Write failing tests for tenant CRUD             | CL-DB-01.1-1.11         |
| 2     | `/generate-test auth unit`           | RED: Write failing tests for OTP/PIN/token flows     | CL-BE-02.1-2.10         |
| 3     | `/generate-test users unit`          | RED: Write failing tests for user CRUD + permissions | CL-BE-03.1-3.8          |
| 4     | `/db-migration tenants`              | GREEN: Create tenants table + RLS                    | CL-DB-01.1, 01.2, 01.11 |
| 5     | `/db-migration tenant_settings`      | GREEN: Create tenant_settings table + RLS            | CL-DB-01.3-1.10         |
| 6     | `/db-migration users`                | GREEN: Create users table + RLS                      | CL-DB-02.1-2.10         |
| 7     | `/db-migration staff_permissions`    | GREEN: Create staff_permissions + RLS                | CL-DB-02.5, 02.6        |
| 8     | `/db-migration otp_codes`            | GREEN: Create OTP codes table                        | CL-DB-02.1              |
| 9     | `/db-migration audit_logs`           | GREEN: Create audit logs table + RLS                 | CL-DB-01.1 (implicit)   |
| 10    | `/scaffold-module tenants`           | GREEN: Implement tenant CRUD + settings              | CL-BE-03.1-3.3          |
| 11    | `/scaffold-module auth`              | GREEN: Implement OTP/PIN/token endpoints             | CL-BE-02.1-2.10         |
| 12    | `/scaffold-module users`             | GREEN: Implement user CRUD + permissions             | CL-BE-03.4-3.8          |
| 13    | `/generate-seed tenants`             | GREEN: Create realistic seed data                    | —                       |
| 14    | `/generate-seed users`               | GREEN: Create seed users with all roles              | —                       |
| 15    | `/generate-test phase-1 integration` | Integration tests for full auth + tenant flows       | IT-2.1 through IT-3.4   |

### Agent Activation Flow

- **Proactive:** `test-runner` (A5) -- runs tests after every code change
- **Proactive:** `db-reviewer` (A1) -- triggers on migration files; validates schema, RLS policies, indexes, FK integrity, naming conventions
- **Proactive:** `business-logic-validator` (A3) -- triggers on service files; validates auth flows and tenant logic against spec
- **Manual:** `domain-expert` (A2) -- invoke for clarification on role hierarchy, permission model, or wager type implications
- **Manual:** `checklist-validator` (A6) -- invoke after phase completion to confirm CL-DB-01/02 and CL-BE-02/03 coverage
- **Manual (MILESTONE):** `devils-advocate` (A7) -- stress-tests tenant isolation, auth bypass attempts, permission escalation

### TDD Steps

#### RED -- Write Failing Tests

**DB Schema Tests (CL-DB-01, CL-DB-02):**

```bash
# Tenant schema tests
/generate-test tenants unit
# Tests:
#   - tenants table exists with all 11 columns and correct types
#   - UNIQUE constraint on phone
#   - status defaults to 'trial'
#   - state_code is NOT NULL (required for GST detection)
#   - created_at and updated_at default to now()
#   - RLS: tenant A cannot read tenant B's data
#   - insert and retrieve a tenant record

# Tenant settings schema tests
#   - tenant_settings table exists with all 17 columns
#   - FK constraint to tenants
#   - UNIQUE constraint on tenant_id (one settings per tenant)
#   - All boolean defaults: batch_enabled=false, shift_enabled=false, auth_otp_enabled=true, auth_pin_enabled=false
#   - wage_cycle_day defaults to 0 (Sunday)
#   - Damage deduction defaults: minor=25%, major=50%, reject=100%
#   - Insert settings for a tenant and verify retrieval

# User schema tests
/generate-test users unit
# Tests:
#   - users table exists with all columns
#   - Composite UNIQUE on (tenant_id, phone)
#   - FK to tenants
#   - Role enum matches spec: super_admin, owner, staff, wager, tailor, packager
#   - is_active defaults to true
#   - language defaults to 'en'
#   - RLS: user in tenant A cannot see users from tenant B
#   - RLS: wager can only see own record

# staff_permissions schema tests
#   - Table exists with correct schema
#   - UNIQUE on (user_id, permission)
#   - FK to tenants and users

# otp_codes schema tests
#   - Table exists with correct schema
#   - expires_at is NOT NULL
#   - verified defaults to false

# audit_logs schema tests
#   - Table exists with correct schema
#   - FK to tenants
#   - user_id is NULLABLE (system actions)
```

**Auth Endpoint Tests (CL-BE-02):**

```bash
/generate-test auth unit
# Tests:
#   OTP Send (POST /api/auth/otp/send):
#     - Valid phone -> 200, OTP created in DB (hashed)
#     - Invalid phone format -> 400
#     - Inactive user -> 403
#     - OTP not enabled for tenant (auth_otp_enabled=false) -> 400
#     - Rate limiting: max 5 OTPs per phone per hour -> 429
#
#   OTP Verify (POST /api/auth/otp/verify):
#     - Valid OTP -> 200, returns JWT + user profile
#     - Invalid OTP -> 401
#     - Expired OTP (5 min default) -> 401
#     - Already used OTP (verified=true) -> 401
#     - JWT contains tenantId, userId, role
#     - Response includes tenant feature flags
#     - Response includes user language preference
#
#   PIN Verify (POST /api/auth/pin/verify):
#     - Valid phone + PIN -> 200, returns JWT
#     - Invalid PIN -> 401
#     - PIN auth not enabled for tenant (auth_pin_enabled=false) -> 400
#     - User without PIN set -> 400
#
#   PIN Set (PUT /api/auth/pin):
#     - Authenticated user can set PIN -> 200
#     - PIN must be exactly 4 digits -> 400
#     - Unauthenticated -> 401
#
#   Token Refresh (POST /api/auth/refresh):
#     - Valid refresh token -> new access token
#     - Expired refresh token -> 401
#
#   Get Me (GET /api/auth/me):
#     - Returns current user profile with role and permissions
#     - Includes tenant settings (feature flags)
#     - Includes language preference
```

**Tenant & User Endpoint Tests (CL-BE-03):**

```bash
/generate-test tenants unit
# Tests:
#   Tenant CRUD:
#     - Super admin can create tenant -> 201
#     - Non-super-admin -> 403
#     - Create tenant auto-creates tenant_settings row
#     - List tenants with pagination (limit, offset)
#     - Get tenant by ID
#     - Update tenant status (active/suspended/trial)
#
#   Tenant Settings:
#     - Owner can read own tenant settings
#     - Owner can update settings
#     - Update batch_enabled flag
#     - Update shift_enabled flag
#     - Update wage_cycle_day (validate 0-6)
#     - Update damage deduction rates (validate 0-100)

/generate-test users unit
# Tests:
#   User CRUD:
#     - Owner can create user with any role -> 201
#     - Creating user with role='wager' auto-creates wager_profile
#     - Duplicate phone in same tenant -> 409
#     - Same phone in different tenant -> 201 (allowed)
#     - Filter users by role
#     - Staff with 'master_data' permission can manage users
#     - Wager/tailor/packager cannot create users -> 403
#     - User deactivation (soft) sets is_active=false
#
#   Permissions:
#     - Owner can set staff permissions
#     - Permissions validated against allowed list
#     - Non-staff user cannot have permissions -> 400
#     - PUT replaces all permissions (not append)
```

Run all tests -- they **MUST** all fail:

```bash
pnpm test -- --run src/modules/tenants/__tests__/*.test.ts
pnpm test -- --run src/modules/auth/__tests__/*.test.ts
pnpm test -- --run src/modules/users/__tests__/*.test.ts
```

#### GREEN -- Implement

```bash
# 1. Create all 6 DB migrations (in order due to FK dependencies)
/db-migration tenants
/db-migration tenant_settings          # FK -> tenants
/db-migration users                    # FK -> tenants
/db-migration staff_permissions        # FK -> tenants, users
/db-migration otp_codes                # No FK (phone-based lookup)
/db-migration audit_logs               # FK -> tenants, users (nullable)

# 2. Create updated_at trigger function (reusable for all tables)
# Creates: set_updated_at() trigger function applied to tenants, tenant_settings, users

# 3. Create RLS policies for all 6 tables
# tenants: tenant_isolation_policy
# tenant_settings: tenant_id = current_tenant
# users: tenant scoping + wager sees own record
# staff_permissions: tenant scoping
# audit_logs: tenant scoping

# 4. Run migrations
pnpm db:migrate

# 5. Implement modules
/scaffold-module tenants
# Creates:
#   src/modules/tenants/tenant.routes.ts
#   src/modules/tenants/tenant.schema.ts        (Zod)
#   src/modules/tenants/tenant.service.ts
#   src/modules/tenants/tenant.repository.ts
#   src/modules/tenants/tenant-settings.service.ts
#   src/modules/tenants/tenant-settings.repository.ts

/scaffold-module auth
# Creates:
#   src/modules/auth/auth.routes.ts
#   src/modules/auth/auth.schema.ts             (Zod)
#   src/modules/auth/auth.service.ts
#   src/modules/auth/sms.service.ts             (pluggable: mock/twilio/msg91)

/scaffold-module users
# Creates:
#   src/modules/users/user.routes.ts
#   src/modules/users/user.schema.ts            (Zod)
#   src/modules/users/user.service.ts
#   src/modules/users/user.repository.ts
#   src/modules/users/permission.service.ts
#   src/modules/users/permission.repository.ts

# 6. Generate seed data
/generate-seed tenants
# Seeds: 2 tenants (Ravi Textiles - Tamil Nadu, Kumar Textiles - Karnataka)
/generate-seed users
# Seeds: owner, staff, wager (all 4 types), tailor, packager per tenant
```

Run all tests -- they **MUST** all pass:

```bash
pnpm test -- --run
```

#### REFACTOR

- Extract JWT utilities into `src/shared/jwt.ts` (generateToken, verifyToken, refreshToken)
- Extract SMS service interface into `src/shared/sms/sms.interface.ts` with mock implementation
- Ensure all Zod schemas use `.strip()` to remove unknown fields
- Add i18n keys:
  ```bash
  /add-translation auth.otp.sent "OTP sent successfully" "OTP வெற்றிகரமாக அனுப்பப்பட்டது"
  /add-translation auth.otp.invalid "Invalid OTP" "தவறான OTP"
  /add-translation auth.otp.expired "OTP has expired" "OTP காலாவதியானது"
  /add-translation auth.pin.invalid "Invalid PIN" "தவறான PIN"
  /add-translation auth.pin.not_set "PIN not set for this account" "இந்த கணக்கிற்கு PIN அமைக்கப்படவில்லை"
  /add-translation auth.inactive_user "Account is deactivated" "கணக்கு செயலிழக்கப்பட்டது"
  /add-translation tenant.created "Tenant created successfully" "நிறுவனம் வெற்றிகரமாக உருவாக்கப்பட்டது"
  /add-translation user.created "User created successfully" "பயனர் வெற்றிகரமாக உருவாக்கப்பட்டார்"
  /add-translation user.duplicate_phone "Phone number already exists in this tenant" "இந்த நிறுவனத்தில் தொலைபேசி எண் ஏற்கனவே உள்ளது"
  ```
- Verify no cross-tenant data leakage in tests
- Verify TypeScript strict mode: `pnpm tsc --noEmit`

### Curl Commands

See [06e-curl-reference.md, Phase 1 section](./06e-curl-reference.md#phase-1-foundation--tenants-users-auth).

Key manual tests:

```bash
# Create tenant (as super admin)
curl -s -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ravi Textiles","ownerName":"Ravi","phone":"+919876543210","stateCode":"TN"}' | jq

# Send OTP
curl -s -X POST http://localhost:3000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}' | jq

# Verify OTP
curl -s -X POST http://localhost:3000/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","code":"123456"}' | jq

# Get current user
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq

# Create user (as owner)
curl -s -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543211","name":"Muthu","role":"wager"}' | jq

# Set staff permissions
curl -s -X PUT http://localhost:3000/api/users/$STAFF_ID/permissions \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissions":["production_entry","godown_management"]}' | jq
```

### Integration Tests

| Test ID | Description                                                                                                    | What It Validates              |
| ------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| IT-2.1  | Full OTP flow: send -> verify -> receive JWT -> access protected route                                         | End-to-end OTP authentication  |
| IT-2.2  | Full PIN flow: set PIN -> login with PIN -> access route                                                       | PIN authentication alternative |
| IT-2.3  | Token refresh cycle: login -> token expires -> refresh -> continue                                             | Token lifecycle management     |
| IT-2.4  | OTP rate limiting prevents brute force (>5 attempts/hour)                                                      | Security: rate limiting        |
| IT-2.5  | Auth method disabled at tenant level -> rejected                                                               | Feature flag enforcement       |
| IT-2.6  | Login returns correct tenant feature flags                                                                     | Feature flag propagation       |
| IT-3.1  | Create tenant -> create owner -> login -> create staff -> assign permissions -> staff accesses permitted route | Full authorization chain       |
| IT-3.2  | Create wager user -> verify wager_profile auto-created                                                         | User-profile auto-creation     |
| IT-3.3  | Deactivate user -> verify login fails                                                                          | User lifecycle                 |
| IT-3.4  | Tenant settings update -> feature flags affect downstream APIs                                                 | Settings propagation           |

### Verification Gate

- [ ] All unit tests pass (~75 tests)
- [ ] All integration tests pass (IT-2.1 through IT-3.4, 10 tests)
- [ ] All 6 DB tables created with correct schema
- [ ] RLS policies active on all 6 tables
- [ ] `updated_at` trigger function working on tenants, tenant_settings, users
- [ ] Curl manual testing completed for all 20 endpoints
- [ ] `db-reviewer` approved all 6 migrations
- [ ] `business-logic-validator` approved auth service and tenant service logic
- [ ] `checklist-validator` confirmed coverage:
  - CL-DB-01: 11/11 items complete
  - CL-DB-02: 10/10 items complete
  - CL-DB-16: items 16.1 (partial), 16.2 (partial), 16.3, 16.6 complete
  - CL-BE-02: 10/10 items complete
  - CL-BE-03: 8/8 items complete
- [ ] **MILESTONE: `devils-advocate` review completed**
  - Tenant isolation stress-tested (cross-tenant access attempts)
  - Auth bypass attempts verified (expired tokens, malformed JWTs, replay attacks)
  - Permission escalation attempts verified (wager trying owner endpoints)
  - Rate limiting verified (OTP brute force protection)
- [ ] i18n keys added for all user-facing strings in auth, tenants, users modules
- [ ] Seed data created for 2 tenants with all role types
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint warnings (`pnpm lint`)

---

## Phase 1b: Registration & Invite System

> **Dependencies:** Phase 1 | **DB Tables:** 1 (`invite_codes`) | **Endpoints:** 8 | **Tests:** ~14 unit

### Overview

Phase 1b adds public registration and worker invite flows. It enables:
- Public tenant self-signup (phone + OTP based)
- Super admin can create tenants with owner in one step
- Owners can generate invite codes for workers to self-register
- Workers join via invite code + OTP verification

### DB Tables

#### `invite_codes`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK -> tenants, NOT NULL | |
| `code` | `varchar(8)` | NOT NULL, UNIQUE | 6-char uppercase alphanumeric (excluding I/O/0/1) |
| `role` | `user_role` | NOT NULL | Role assigned on redeem |
| `max_uses` | `integer` | NOT NULL, default `1` | |
| `use_count` | `integer` | NOT NULL, default `0` | |
| `expires_at` | `timestamptz` | NULLABLE | Null = never expires |
| `created_by` | `uuid` | FK -> users, NOT NULL | |
| `is_active` | `boolean` | NOT NULL, default `true` | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** `tenant_id`, `code` (unique), `is_active`
**RLS:** Tenant isolation policy on `tenant_id`

### Shared OTP Utility

**File:** `src/shared/otp.ts`

Extracted from AuthService into reusable functions:
- `generateAndStoreOtp(phone)` — rate limit (5/hr), generate 6-digit code, bcrypt hash, store in `otp_codes`, send via SMS service
- `verifyStoredOtp(phone, code)` — find latest unexpired OTP, bcrypt compare, mark verified

### Endpoints (8)

#### Public Registration (5 endpoints via `/api/register`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/api/register/otp/send` | Send OTP for new tenant registration | Public |
| `POST` | `/api/register/tenant` | Register tenant + owner (verify OTP, create in transaction) | Public |
| `GET` | `/api/register/invite/:code` | Validate invite code → returns `{ valid, role, tenantName }` | Public |
| `POST` | `/api/register/invite/otp/send` | Send OTP for invite registration | Public |
| `POST` | `/api/register/invite` | Redeem invite (verify OTP, create user, increment use_count) | Public |

#### Invite Management (3 endpoints via `/api/invites`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/api/invites` | Create invite code | Owner / Staff |
| `GET` | `/api/invites` | List tenant's invite codes (paginated) | Owner / Staff |
| `PUT` | `/api/invites/:id/deactivate` | Deactivate invite code | Owner / Staff |

#### Enhanced Tenant Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/api/tenants/with-owner` | Create tenant + settings + owner in one transaction | Super Admin |

### Service Logic

**Registration (`registration.service.ts`):**
1. `sendRegistrationOtp(phone)` — checks phone not already a tenant owner, calls `generateAndStoreOtp`
2. `registerTenant(data)` — verifies OTP, creates tenant (status: trial) + tenant_settings + owner user in transaction, generates JWT tokens, returns AuthResponse

**Invites (`invite.service.ts`):**
1. `create(tenantId, data)` — generates 6-char code (crypto.randomBytes, retries on collision), stores with role/maxUses/expiresAt
2. `validateCode(code)` — checks active, not expired, use_count < max_uses
3. `sendInviteOtp(code, phone)` — validates invite, checks phone uniqueness in tenant, sends OTP
4. `redeem(data)` — validates invite, verifies OTP, creates user (auto-creates wager_profile if role=wager), increments use_count, returns AuthResponse

**Tenant Enhancement (`tenant.service.ts`):**
- `createWithOwner(data)` — creates tenant + settings + owner in single transaction
- `findAll(filters)` — enhanced with search (ILIKE across name/owner_name/phone) and status filter

### Curl Commands

```bash
# Public: Register new tenant
curl -s -X POST http://localhost:3000/api/register/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}' | jq

curl -s -X POST http://localhost:3000/api/register/tenant \
  -H "Content-Type: application/json" \
  -d '{"businessName":"New Business","ownerName":"Owner","phone":"+919876543210","stateCode":"33","otpCode":"123456"}' | jq

# Public: Worker invite flow
curl -s http://localhost:3000/api/register/invite/ABC123 | jq

curl -s -X POST http://localhost:3000/api/register/invite/otp/send \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC123","phone":"+919876543211"}' | jq

curl -s -X POST http://localhost:3000/api/register/invite \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC123","name":"Worker Name","phone":"+919876543211","otpCode":"654321"}' | jq

# Authenticated: Invite management
curl -s -X POST http://localhost:3000/api/invites \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"wager","maxUses":5,"expiresInDays":30}' | jq

curl -s http://localhost:3000/api/invites \
  -H "Authorization: Bearer $OWNER_TOKEN" | jq

# Super admin: Create tenant with owner
curl -s -X POST http://localhost:3000/api/tenants/with-owner \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Business","ownerName":"Owner","phone":"+919876543299","stateCode":"33"}' | jq
```

### Verification Gate

- [ ] Migration `0013_registration_system.sql` applied
- [ ] All 8 new endpoints responding correctly
- [ ] Public registration flow works end-to-end
- [ ] Invite code generation, validation, and redemption work
- [ ] OTP rate limiting enforced (5/hr per phone)
- [ ] Tenant isolation maintained on invite_codes table
- [ ] TypeScript compiles clean (`pnpm tsc --noEmit`)
- [ ] 14 new frontend tests passing

---

## Phase 2: Master Data

> **Dependencies:** Phase 1 | **DB Epic:** 2 | **BE Epic:** 4 | **CL-DB-03:** 6 items, **CL-DB-04:** 11 items, **CL-DB-05:** 6 items, **CL-DB-06:** 4 items, **CL-DB-07:** 5 items (total 32 items + CL-DB-16 partial) | **CL-BE-04:** 14 items | **Endpoints:** 30 | **DB Tables:** 9 | **Tests:** ~90 unit, ~5 integration

### Overview

Phase 2 creates all master data tables and CRUD endpoints. Master data is the configuration backbone of the ERP -- loom types and looms define production capacity, products define manufacturing parameters and wage rates, suppliers and customers define procurement and sales partners, godowns define storage locations, and wager profiles define the worker-type-specific configuration.

After Phase 2, you can:

- Define loom types with capacity ratings and register individual looms
- Create product definitions with all manufacturing parameters (paavu/oodai consumption, wage rates, stitch/knot rates, bundle config, GST rate, color pricing mode)
- Manage suppliers (cone providers) and customers (wholesale/retail with credit terms)
- Configure godowns (warehouses) including Paavu Pattarai
- Create and manage wager profiles with type-specific settings (Types 1-4)
- Assign wagers to looms

This phase is the largest in terms of endpoints (30) and tables (9). It is CRUD-heavy with relatively straightforward business logic, but the product table is complex (24+ columns) and requires careful Zod schema design.

### DB Tables

#### `loom_types`

| Column                    | Type           | Constraints               | Notes                                    |
| ------------------------- | -------------- | ------------------------- | ---------------------------------------- |
| `id`                      | `uuid`         | PK                        |                                          |
| `tenant_id`               | `uuid`         | FK -> tenants, NOT NULL   |                                          |
| `name`                    | `varchar(100)` | NOT NULL                  | e.g., 'Single Lengthy', 'Double Lengthy' |
| `nickname`                | `varchar(50)`  | NULLABLE                  | e.g., 'Single', 'Box', 'Air Loom'        |
| `capacity_pieces_per_day` | `integer`      | NOT NULL                  | Capacity per day per loom of this type   |
| `is_active`               | `boolean`      | NOT NULL, default `true`  |                                          |
| `created_at`              | `timestamptz`  | NOT NULL, default `now()` |                                          |
| `updated_at`              | `timestamptz`  | NOT NULL, default `now()` |                                          |

**Unique constraint:** `(tenant_id, name)`

#### `looms`

| Column               | Type                                             | Constraints                       | Notes                      |
| -------------------- | ------------------------------------------------ | --------------------------------- | -------------------------- |
| `id`                 | `uuid`                                           | PK                                |                            |
| `tenant_id`          | `uuid`                                           | FK -> tenants, NOT NULL           |                            |
| `loom_type_id`       | `uuid`                                           | FK -> loom_types, NOT NULL        |                            |
| `loom_number`        | `varchar(50)`                                    | NOT NULL                          | Display identifier         |
| `assigned_wager_id`  | `uuid`                                           | FK -> users, NULLABLE             | Currently assigned wager   |
| `ownership`          | `enum('owner','wager')`                          | NOT NULL                          | Who owns the physical loom |
| `maintenance_status` | `enum('operational','under_maintenance','idle')` | NOT NULL, default `'operational'` |                            |
| `is_active`          | `boolean`                                        | NOT NULL, default `true`          |                            |
| `created_at`         | `timestamptz`                                    | NOT NULL, default `now()`         |                            |
| `updated_at`         | `timestamptz`                                    | NOT NULL, default `now()`         |                            |

**Unique constraint:** `(tenant_id, loom_number)`

#### `products`

| Column                    | Type                                      | Constraints                   | Notes                    |
| ------------------------- | ----------------------------------------- | ----------------------------- | ------------------------ |
| `id`                      | `uuid`                                    | PK                            |                          |
| `tenant_id`               | `uuid`                                    | FK -> tenants, NOT NULL       |                          |
| `name`                    | `varchar(255)`                            | NOT NULL                      | e.g., 'Khadi', 'Jakkadu' |
| `size`                    | `varchar(20)`                             | NOT NULL                      | e.g., '30x60', '27x54'   |
| `category`                | `enum('single','double','triple','quad')` | NOT NULL                      | Product length category  |
| `paavu_to_piece_ratio`    | `decimal(10,4)`                           | NOT NULL                      |                          |
| `paavu_consumption_grams` | `decimal(10,2)`                           | NOT NULL                      | Per piece                |
| `paavu_wastage_grams`     | `decimal(10,2)`                           | NOT NULL, default `0`         |                          |
| `paavu_wastage_pct`       | `decimal(5,2)`                            | NULLABLE                      | Alternative percentage   |
| `oodai_consumption_grams` | `decimal(10,2)`                           | NOT NULL                      | Per piece                |
| `oodai_wastage_grams`     | `decimal(10,2)`                           | NOT NULL, default `0`         |                          |
| `oodai_wastage_pct`       | `decimal(5,2)`                            | NULLABLE                      |                          |
| `wage_rate_per_kg`        | `decimal(10,2)`                           | NOT NULL, default `0`         | Type 1 & 3 wagers        |
| `wage_rate_per_piece`     | `decimal(10,2)`                           | NOT NULL, default `0`         | Type 2 & 4 wagers        |
| `stitch_rate_per_piece`   | `decimal(10,2)`                           | NOT NULL, default `0`         | Tailor stitch rate       |
| `knot_rate_per_piece`     | `decimal(10,2)`                           | NOT NULL, default `0`         | Tailor knot rate         |
| `small_bundle_count`      | `integer`                                 | NOT NULL, default `10`        | Pieces per small bundle  |
| `large_bundle_count`      | `integer`                                 | NOT NULL, default `50`        | Pieces per large bundle  |
| `bundle_rate_small`       | `decimal(10,2)`                           | NOT NULL, default `0`         | Packager rate            |
| `bundle_rate_large`       | `decimal(10,2)`                           | NOT NULL, default `0`         | Packager rate            |
| `gst_rate_pct`            | `decimal(5,2)`                            | NOT NULL, default `5.00`      | GST %                    |
| `color_pricing_mode`      | `enum('average','per_color')`             | NOT NULL, default `'average'` | Mode 1 or Mode 2         |
| `hsn_code`                | `varchar(20)`                             | NULLABLE                      | HSN code for GST         |
| `is_active`               | `boolean`                                 | NOT NULL, default `true`      |                          |
| `created_at`              | `timestamptz`                             | NOT NULL, default `now()`     |                          |
| `updated_at`              | `timestamptz`                             | NOT NULL, default `now()`     |                          |

**Unique constraint:** `(tenant_id, name, size)`

#### `product_color_prices`

| Column                    | Type            | Constraints               | Notes |
| ------------------------- | --------------- | ------------------------- | ----- |
| `id`                      | `uuid`          | PK                        |       |
| `tenant_id`               | `uuid`          | FK -> tenants, NOT NULL   |       |
| `product_id`              | `uuid`          | FK -> products, NOT NULL  |       |
| `color`                   | `varchar(50)`   | NOT NULL                  |       |
| `selling_price_per_piece` | `decimal(10,2)` | NOT NULL                  |       |
| `created_at`              | `timestamptz`   | NOT NULL, default `now()` |       |
| `updated_at`              | `timestamptz`   | NOT NULL, default `now()` |       |

**Unique constraint:** `(product_id, color)`

#### `shift_wage_rates`

| Column                | Type                                | Constraints               | Notes |
| --------------------- | ----------------------------------- | ------------------------- | ----- |
| `id`                  | `uuid`                              | PK                        |       |
| `tenant_id`           | `uuid`                              | FK -> tenants, NOT NULL   |       |
| `product_id`          | `uuid`                              | FK -> products, NOT NULL  |       |
| `shift`               | `enum('morning','evening','night')` | NOT NULL                  |       |
| `wage_rate_per_kg`    | `decimal(10,2)`                     | NOT NULL                  |       |
| `wage_rate_per_piece` | `decimal(10,2)`                     | NOT NULL                  |       |
| `created_at`          | `timestamptz`                       | NOT NULL, default `now()` |       |
| `updated_at`          | `timestamptz`                       | NOT NULL, default `now()` |       |

**Unique constraint:** `(product_id, shift)`

#### `suppliers`

| Column       | Type           | Constraints               | Notes            |
| ------------ | -------------- | ------------------------- | ---------------- |
| `id`         | `uuid`         | PK                        |                  |
| `tenant_id`  | `uuid`         | FK -> tenants, NOT NULL   |                  |
| `name`       | `varchar(255)` | NOT NULL                  | Cotton mill name |
| `phone`      | `varchar(15)`  | NULLABLE                  |                  |
| `address`    | `text`         | NULLABLE                  |                  |
| `gstin`      | `varchar(15)`  | NULLABLE                  |                  |
| `is_active`  | `boolean`      | NOT NULL, default `true`  |                  |
| `created_at` | `timestamptz`  | NOT NULL, default `now()` |                  |
| `updated_at` | `timestamptz`  | NOT NULL, default `now()` |                  |

#### `customers`

| Column                | Type                                                          | Constraints               | Notes                     |
| --------------------- | ------------------------------------------------------------- | ------------------------- | ------------------------- |
| `id`                  | `uuid`                                                        | PK                        |                           |
| `tenant_id`           | `uuid`                                                        | FK -> tenants, NOT NULL   |                           |
| `name`                | `varchar(255)`                                                | NOT NULL                  |                           |
| `phone`               | `varchar(15)`                                                 | NULLABLE                  |                           |
| `address`             | `text`                                                        | NULLABLE                  |                           |
| `state_code`          | `varchar(2)`                                                  | NOT NULL                  | For GST intra/inter-state |
| `gstin`               | `varchar(15)`                                                 | NULLABLE                  |                           |
| `customer_type`       | `enum('wholesale_partial','wholesale_bill_to_bill','retail')` | NOT NULL                  |                           |
| `credit_period_days`  | `integer`                                                     | NOT NULL, default `30`    |                           |
| `outstanding_balance` | `decimal(12,2)`                                               | NOT NULL, default `0`     | Real-time balance         |
| `is_active`           | `boolean`                                                     | NOT NULL, default `true`  |                           |
| `created_at`          | `timestamptz`                                                 | NOT NULL, default `now()` |                           |
| `updated_at`          | `timestamptz`                                                 | NOT NULL, default `now()` |                           |

#### `godowns`

| Column        | Type                              | Constraints                  | Notes                      |
| ------------- | --------------------------------- | ---------------------------- | -------------------------- |
| `id`          | `uuid`                            | PK                           |                            |
| `tenant_id`   | `uuid`                            | FK -> tenants, NOT NULL      |                            |
| `name`        | `varchar(255)`                    | NOT NULL                     |                            |
| `address`     | `text`                            | NULLABLE                     |                            |
| `is_main`     | `boolean`                         | NOT NULL, default `false`    | One main godown per tenant |
| `godown_type` | `enum('godown','paavu_pattarai')` | NOT NULL, default `'godown'` |                            |
| `is_active`   | `boolean`                         | NOT NULL, default `true`     |                            |
| `created_at`  | `timestamptz`                     | NOT NULL, default `now()`    |                            |
| `updated_at`  | `timestamptz`                     | NOT NULL, default `now()`    |                            |

#### `wager_profiles`

| Column                | Type            | Constraints                   | Notes             |
| --------------------- | --------------- | ----------------------------- | ----------------- |
| `id`                  | `uuid`          | PK                            |                   |
| `tenant_id`           | `uuid`          | FK -> tenants, NOT NULL       |                   |
| `user_id`             | `uuid`          | FK -> users, NOT NULL, UNIQUE | 1:1 with user     |
| `wager_type`          | `smallint`      | NOT NULL, CHECK (1-4)         | Type 1/2/3/4      |
| `advance_balance`     | `decimal(12,2)` | NOT NULL, default `0`         | Running balance   |
| `original_advance`    | `decimal(12,2)` | NOT NULL, default `0`         | Initial advance   |
| `additional_advances` | `decimal(12,2)` | NOT NULL, default `0`         | Sum of additional |
| `is_active`           | `boolean`       | NOT NULL, default `true`      |                   |
| `created_at`          | `timestamptz`   | NOT NULL, default `now()`     |                   |
| `updated_at`          | `timestamptz`   | NOT NULL, default `now()`     |                   |

### Endpoints (30)

#### Loom Types (3 endpoints)

| Method | Path                  | Purpose          | Auth                       | CL-BE Ref  |
| ------ | --------------------- | ---------------- | -------------------------- | ---------- |
| `POST` | `/api/loom-types`     | Create loom type | Owner / Staff(master_data) | CL-BE-04.1 |
| `GET`  | `/api/loom-types`     | List loom types  | Authenticated              | CL-BE-04.1 |
| `PUT`  | `/api/loom-types/:id` | Update loom type | Owner / Staff(master_data) | CL-BE-04.1 |

#### Looms (4 endpoints)

| Method | Path                    | Purpose                                        | Auth                       | CL-BE Ref        |
| ------ | ----------------------- | ---------------------------------------------- | -------------------------- | ---------------- |
| `POST` | `/api/looms`            | Create loom                                    | Owner / Staff(master_data) | CL-BE-04.2       |
| `GET`  | `/api/looms`            | List looms (filterable by type, status, wager) | Authenticated              | CL-BE-04.2       |
| `PUT`  | `/api/looms/:id`        | Update loom                                    | Owner / Staff(master_data) | CL-BE-04.2, 04.3 |
| `PUT`  | `/api/looms/:id/assign` | Assign wager to loom                           | Owner / Staff(master_data) | CL-BE-04.2       |

**Note:** `GET /api/looms` returns joined fields for easier frontend display:
- `loomTypeName` — from `loom_types.name`
- `wagerName` — from `users.name` via `assigned_wager_id`
- `ownerName` — from `tenants.owner_name`

#### Products (3 endpoints)

| Method | Path                | Purpose                                           | Auth                       | CL-BE Ref  |
| ------ | ------------------- | ------------------------------------------------- | -------------------------- | ---------- |
| `POST` | `/api/products`     | Create product (all manufacturing params)         | Owner / Staff(master_data) | CL-BE-04.4 |
| `GET`  | `/api/products`     | List products (filterable by category, is_active) | Authenticated              | CL-BE-04.4 |
| `PUT`  | `/api/products/:id` | Update product                                    | Owner / Staff(master_data) | CL-BE-04.4 |

#### Color Prices (4 endpoints)

| Method   | Path                                      | Purpose                       | Auth                       | CL-BE Ref  |
| -------- | ----------------------------------------- | ----------------------------- | -------------------------- | ---------- |
| `POST`   | `/api/products/:id/color-prices`          | Add color price               | Owner / Staff(master_data) | CL-BE-04.5 |
| `GET`    | `/api/products/:id/color-prices`          | List color prices for product | Authenticated              | CL-BE-04.5 |
| `PUT`    | `/api/products/:id/color-prices/:priceId` | Update color price            | Owner / Staff(master_data) | CL-BE-04.5 |
| `DELETE` | `/api/products/:id/color-prices/:priceId` | Delete color price            | Owner / Staff(master_data) | CL-BE-04.5 |

#### Shift Rates (3 endpoints)

| Method | Path                                    | Purpose                      | Auth                       | CL-BE Ref  |
| ------ | --------------------------------------- | ---------------------------- | -------------------------- | ---------- |
| `POST` | `/api/products/:id/shift-rates`         | Add shift wage rate          | Owner / Staff(master_data) | CL-BE-04.7 |
| `GET`  | `/api/products/:id/shift-rates`         | List shift rates for product | Authenticated              | CL-BE-04.7 |
| `PUT`  | `/api/products/:id/shift-rates/:rateId` | Update shift wage rate       | Owner / Staff(master_data) | CL-BE-04.7 |

#### Suppliers (3 endpoints)

| Method | Path                 | Purpose         | Auth                       | CL-BE Ref  |
| ------ | -------------------- | --------------- | -------------------------- | ---------- |
| `POST` | `/api/suppliers`     | Create supplier | Owner / Staff(master_data) | CL-BE-04.9 |
| `GET`  | `/api/suppliers`     | List suppliers  | Authenticated              | CL-BE-04.9 |
| `PUT`  | `/api/suppliers/:id` | Update supplier | Owner / Staff(master_data) | CL-BE-04.9 |

#### Customers (3 endpoints)

| Method | Path                 | Purpose                                        | Auth                       | CL-BE Ref          |
| ------ | -------------------- | ---------------------------------------------- | -------------------------- | ------------------ |
| `POST` | `/api/customers`     | Create customer (with type and credit terms)   | Owner / Staff(master_data) | CL-BE-04.10, 04.11 |
| `GET`  | `/api/customers`     | List customers (filterable by type, is_active) | Authenticated              | CL-BE-04.10        |
| `PUT`  | `/api/customers/:id` | Update customer                                | Owner / Staff(master_data) | CL-BE-04.10, 04.11 |

#### Godowns (3 endpoints)

| Method | Path               | Purpose                           | Auth                       | CL-BE Ref   |
| ------ | ------------------ | --------------------------------- | -------------------------- | ----------- |
| `POST` | `/api/godowns`     | Create godown                     | Owner / Staff(master_data) | CL-BE-04.12 |
| `GET`  | `/api/godowns`     | List godowns (filterable by type) | Authenticated              | CL-BE-04.12 |
| `PUT`  | `/api/godowns/:id` | Update godown                     | Owner / Staff(master_data) | CL-BE-04.12 |

#### Wagers (4 endpoints)

| Method | Path              | Purpose                                             | Auth                 | CL-BE Ref   |
| ------ | ----------------- | --------------------------------------------------- | -------------------- | ----------- |
| `POST` | `/api/wagers`     | Create wager profile (manual, if not auto-created)  | Owner                | CL-BE-04.13 |
| `GET`  | `/api/wagers`     | List wager profiles (filterable by type, is_active) | Owner / Staff        | CL-BE-04.13 |
| `GET`  | `/api/wagers/:id` | Get wager profile with advance balance              | Owner / Staff / Self | CL-BE-04.13 |
| `PUT`  | `/api/wagers/:id` | Update wager profile (type, active status)          | Owner                | CL-BE-04.13 |

**Note:** `GET /api/wagers/me` is handled by wager accessing own profile via `GET /api/wagers/:id` where `:id` is resolved from `req.user` (CL-BE-04.14).

**Note:** `GET /api/wagers` returns a `name` field joined from the `users` table for easier frontend display.

### Skills to Invoke

| Order | Command                              | Purpose                                                    | CL Ref                           |
| ----- | ------------------------------------ | ---------------------------------------------------------- | -------------------------------- |
| 1     | `/generate-test loom-types unit`     | RED: Loom type schema + CRUD tests                         | CL-DB-03.1-3.2, CL-BE-04.1       |
| 2     | `/generate-test looms unit`          | RED: Loom schema + CRUD + assignment tests                 | CL-DB-03.3-3.6, CL-BE-04.2-4.3   |
| 3     | `/generate-test products unit`       | RED: Product schema + CRUD tests (24+ columns)             | CL-DB-04.1-4.11, CL-BE-04.4-4.8  |
| 4     | `/generate-test suppliers unit`      | RED: Supplier CRUD tests                                   | CL-DB-05.1, CL-BE-04.9           |
| 5     | `/generate-test customers unit`      | RED: Customer CRUD + type + credit tests                   | CL-DB-05.2-5.6, CL-BE-04.10-4.11 |
| 6     | `/generate-test godowns unit`        | RED: Godown CRUD + main constraint tests                   | CL-DB-06.1-6.4, CL-BE-04.12      |
| 7     | `/generate-test wagers unit`         | RED: Wager profile CRUD + type validation tests            | CL-DB-07.1-7.5, CL-BE-04.13-4.14 |
| 8     | `/db-migration loom_types`           | GREEN: Create loom_types table + RLS                       | CL-DB-03.1-3.2                   |
| 9     | `/db-migration looms`                | GREEN: Create looms table + RLS                            | CL-DB-03.3-3.6                   |
| 10    | `/db-migration products`             | GREEN: Create products table + RLS                         | CL-DB-04.1-4.7, 4.10-4.11        |
| 11    | `/db-migration product_color_prices` | GREEN: Create color prices table + RLS                     | CL-DB-04.8                       |
| 12    | `/db-migration shift_wage_rates`     | GREEN: Create shift rates table + RLS                      | CL-DB-04.9                       |
| 13    | `/db-migration suppliers`            | GREEN: Create suppliers table + RLS                        | CL-DB-05.1                       |
| 14    | `/db-migration customers`            | GREEN: Create customers table + RLS                        | CL-DB-05.2-5.6                   |
| 15    | `/db-migration godowns`              | GREEN: Create godowns table + RLS                          | CL-DB-06.1-6.4                   |
| 16    | `/db-migration wager_profiles`       | GREEN: Create wager_profiles table + RLS                   | CL-DB-07.1-7.5                   |
| 17    | `/scaffold-module loom-types`        | GREEN: Implement loom type CRUD                            | CL-BE-04.1                       |
| 18    | `/scaffold-module looms`             | GREEN: Implement loom CRUD + assignment                    | CL-BE-04.2-4.3                   |
| 19    | `/scaffold-module products`          | GREEN: Implement product CRUD + color prices + shift rates | CL-BE-04.4-4.8                   |
| 20    | `/scaffold-module suppliers`         | GREEN: Implement supplier CRUD                             | CL-BE-04.9                       |
| 21    | `/scaffold-module customers`         | GREEN: Implement customer CRUD                             | CL-BE-04.10-4.11                 |
| 22    | `/scaffold-module godowns`           | GREEN: Implement godown CRUD                               | CL-BE-04.12                      |
| 23    | `/scaffold-module wagers`            | GREEN: Implement wager profile CRUD                        | CL-BE-04.13-4.14                 |
| 24    | `/generate-seed loom_types`          | GREEN: Seed loom types                                     | —                                |
| 25    | `/generate-seed products`            | GREEN: Seed products with realistic values                 | —                                |
| 26    | `/generate-seed suppliers`           | GREEN: Seed suppliers                                      | —                                |
| 27    | `/generate-seed customers`           | GREEN: Seed customers (all 3 types)                        | —                                |
| 28    | `/generate-seed godowns`             | GREEN: Seed godowns (main + pattarai)                      | —                                |
| 29    | `/generate-seed wager_profiles`      | GREEN: Seed wager profiles (all 4 types)                   | —                                |
| 30    | `/generate-test phase-2 integration` | Integration tests for master data                          | IT-4.1 through IT-4.5            |

### Agent Activation Flow

- **Proactive:** `test-runner` (A5) -- runs tests after every code change
- **Proactive:** `db-reviewer` (A1) -- triggers on all 9 migration files; validates schema, RLS, indexes, FKs
- **Proactive:** `business-logic-validator` (A3) -- triggers on service files; validates CRUD logic, feature flag enforcement (shift rates, color pricing mode)
- **Manual:** `domain-expert` (A2) -- invoke for clarification on product fields (paavu/oodai consumption), wager type implications (Types 1-4 affect return validation), or customer types
- **Manual:** `checklist-validator` (A6) -- invoke after phase completion to confirm CL-DB-03 through CL-DB-07 and CL-BE-04 coverage

### TDD Steps

#### RED -- Write Failing Tests

**DB Schema Tests (CL-DB-03 through CL-DB-07):**

```bash
# Loom types
/generate-test loom-types unit
# Tests:
#   - loom_types table exists with all columns
#   - UNIQUE (tenant_id, name)
#   - capacity_pieces_per_day is positive integer
#   - RLS: tenant isolation

# Looms
/generate-test looms unit
# Tests:
#   - looms table exists with all FKs
#   - UNIQUE (tenant_id, loom_number)
#   - assigned_wager_id references user with role='wager'
#   - ownership enum: 'owner', 'wager'
#   - maintenance_status enum: 'operational', 'under_maintenance', 'idle'
#   - RLS: tenant isolation

# Products (complex -- largest schema)
/generate-test products unit
# Tests:
#   - products table exists with all 24+ columns
#   - UNIQUE (tenant_id, name, size)
#   - category enum: 'single', 'double', 'triple', 'quad'
#   - Decimal precision correct for all rate fields
#   - color_pricing_mode enum: 'average', 'per_color'
#   - gst_rate_pct defaults to 5.00
#   - small_bundle_count defaults to 10, large_bundle_count defaults to 50

# Product color prices
#   - Table exists with correct schema
#   - UNIQUE (product_id, color)
#   - FK to products

# Shift wage rates
#   - Table exists with correct schema
#   - shift enum: 'morning', 'evening', 'night'
#   - UNIQUE (product_id, shift)
#   - FK to products

# Suppliers
/generate-test suppliers unit
#   - Table exists with correct schema
#   - FK to tenants
#   - RLS: tenant isolation

# Customers
/generate-test customers unit
#   - Table exists with all columns
#   - customer_type enum: 'wholesale_partial', 'wholesale_bill_to_bill', 'retail'
#   - state_code is NOT NULL
#   - credit_period_days defaults to 30
#   - outstanding_balance defaults to 0
#   - RLS: tenant isolation

# Godowns
/generate-test godowns unit
#   - Table exists with correct schema
#   - godown_type enum: 'godown', 'paavu_pattarai'
#   - Only one godown can have is_main=true per tenant
#   - RLS: tenant isolation

# Wager profiles
/generate-test wagers unit
#   - Table exists with correct schema
#   - wager_type CHECK (1,2,3,4)
#   - UNIQUE on user_id (1:1 with users)
#   - advance_balance defaults to 0
#   - RLS: tenant isolation, wager sees only own profile
```

**API Endpoint Tests (CL-BE-04):**

```bash
/generate-test loom-types unit
# Endpoint tests:
#   - Owner can create loom type -> 201
#   - Duplicate name in tenant -> 409
#   - Capacity must be positive integer -> 400
#   - List returns tenant-scoped results

/generate-test looms unit
# Endpoint tests:
#   - Create loom with loom_type_id -> 201
#   - Assign wager to loom -> 200
#   - Assign non-wager user -> 400
#   - loom_number unique per tenant -> 409
#   - Update maintenance_status
#   - Filter looms by type, status, assigned wager

/generate-test products unit
# Endpoint tests:
#   - Create product with all fields -> 201
#   - Duplicate (name, size) in tenant -> 409
#   - All rate fields accept valid decimals
#   - Category enum validation
#   - color_pricing_mode affects available sub-endpoints
#   - List with filters (category, is_active)
#
# Color price endpoint tests:
#   - Add color price -> 201
#   - Duplicate (product, color) -> 409
#   - Only accessible when color_pricing_mode='per_color' -> 400 otherwise
#   - Delete color price -> 204
#
# Shift rate endpoint tests:
#   - Create shift rate -> 201
#   - Only accessible when tenant shift_enabled=true -> 400 otherwise
#   - Duplicate (product, shift) -> 409

/generate-test suppliers unit
#   - Standard CRUD operations with tenant scoping

/generate-test customers unit
#   - Create with all 3 customer types -> 201
#   - state_code is required -> 400 if missing
#   - credit_period_days defaults to 30
#   - outstanding_balance initialized to 0
#   - List with filters (type, is_active)

/generate-test godowns unit
#   - Create godown -> 201
#   - Only one main godown per tenant
#   - godown_type validation
#   - List godowns with type filter

/generate-test wagers unit
#   - wager_type validates (1-4)
#   - Get wager profile includes advance balance
#   - List wagers with filters (type, is_active)
#   - Wager can read own profile via GET /api/wagers/:id
```

Run all tests -- they **MUST** all fail:

```bash
pnpm test -- --run src/modules/loom-types/__tests__/*.test.ts
pnpm test -- --run src/modules/looms/__tests__/*.test.ts
pnpm test -- --run src/modules/products/__tests__/*.test.ts
pnpm test -- --run src/modules/suppliers/__tests__/*.test.ts
pnpm test -- --run src/modules/customers/__tests__/*.test.ts
pnpm test -- --run src/modules/godowns/__tests__/*.test.ts
pnpm test -- --run src/modules/wagers/__tests__/*.test.ts
```

#### GREEN -- Implement

```bash
# 1. Create all 9 DB migrations (in dependency order)
/db-migration loom_types                # FK -> tenants
/db-migration looms                     # FK -> tenants, loom_types, users
/db-migration products                  # FK -> tenants
/db-migration product_color_prices      # FK -> tenants, products
/db-migration shift_wage_rates          # FK -> tenants, products
/db-migration suppliers                 # FK -> tenants
/db-migration customers                 # FK -> tenants
/db-migration godowns                   # FK -> tenants
/db-migration wager_profiles            # FK -> tenants, users

# 2. Create RLS policies for all 9 tables
# All: tenant_id = current_tenant
# wager_profiles: additional policy for wager seeing only own profile

# 3. Apply updated_at trigger to all 9 tables

# 4. Run migrations
pnpm db:migrate

# 5. Implement modules (7 modules for 9 tables)
/scaffold-module loom-types
# Creates: routes, schema, service, repository

/scaffold-module looms
# Creates: routes, schema, service, repository
# Includes: wager assignment logic (validate user role = 'wager')

/scaffold-module products
# Creates: routes, schema, service, repository
# Also: color-price routes + service, shift-rate routes + service
# Note: Product Zod schema is large (24+ fields) -- use .optional() for nullable fields,
#        group into sections (basic, consumption, wages, bundles, gst, pricing)

/scaffold-module suppliers
/scaffold-module customers
/scaffold-module godowns
/scaffold-module wagers

# 6. Seed data
/generate-seed loom_types
# Seeds: Single Lengthy (15/day), Double Lengthy (8/day), Air Loom (20/day)

/generate-seed products
# Seeds: Khadi 30x60 (single), Jakkadu 40x80 (double) -- with realistic consumption/wage values

/generate-seed suppliers
# Seeds: 2 cotton mills

/generate-seed customers
# Seeds: 1 wholesale_partial, 1 wholesale_bill_to_bill, 1 retail -- with different state codes

/generate-seed godowns
# Seeds: Main godown (is_main=true), Secondary godown, Paavu Pattarai (godown_type='paavu_pattarai')

/generate-seed wager_profiles
# Seeds: 1 each of Type 1, 2, 3, 4 with corresponding looms assigned
```

Run all tests -- they **MUST** all pass:

```bash
pnpm test -- --run
```

#### REFACTOR

- Extract shared CRUD patterns into the `BaseRepository` if repeated across modules
- Create shared Zod schemas for common patterns:
  - `paginationSchema` (limit, offset, sort_by, sort_order)
  - `filterActiveSchema` (is_active boolean optional)
  - `decimalRateSchema` (decimal validation helper)
- Group product Zod schema into logical sections for readability
- Add i18n keys:
  ```bash
  /add-translation loom_type.name "Loom Type" "நெசவுத்தறி வகை"
  /add-translation loom.number "Loom Number" "தறி எண்"
  /add-translation loom.assign_wager "Assign Wager" "நெசவாளரை ஒதுக்கு"
  /add-translation product.name "Product Name" "பொருள் பெயர்"
  /add-translation product.size "Size" "அளவு"
  /add-translation product.category "Category" "வகை"
  /add-translation product.wage_rate_per_kg "Wage Rate (per kg)" "கூலி விகிதம் (கிலோவிற்கு)"
  /add-translation product.wage_rate_per_piece "Wage Rate (per piece)" "கூலி விகிதம் (துண்டிற்கு)"
  /add-translation supplier.name "Supplier Name" "சரக்கு வழங்குநர் பெயர்"
  /add-translation customer.name "Customer Name" "வாடிக்கையாளர் பெயர்"
  /add-translation customer.type "Customer Type" "வாடிக்கையாளர் வகை"
  /add-translation godown.name "Godown Name" "கிடங்கு பெயர்"
  /add-translation godown.main "Main Godown" "முக்கிய கிடங்கு"
  /add-translation godown.paavu_pattarai "Paavu Pattarai" "பாவு பட்டறை"
  /add-translation wager.type "Wager Type" "நெசவாளர் வகை"
  /add-translation wager.advance_balance "Advance Balance" "முன்பண இருப்பு"
  ```
- Ensure loom assignment validates the wager user exists and is active
- Ensure godown `is_main` constraint is enforced at service level (only one per tenant)
- Verify TypeScript strict mode: `pnpm tsc --noEmit`

### Curl Commands

See [06e-curl-reference.md, Phase 2 section](./06e-curl-reference.md#phase-2-master-data).

Key manual tests:

```bash
# Create loom type
curl -s -X POST http://localhost:3000/api/loom-types \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Single Lengthy","capacityPiecesPerDay":15}' | jq

# Create loom and assign wager
curl -s -X POST http://localhost:3000/api/looms \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"loomTypeId":"'$LOOM_TYPE_ID'","loomNumber":"L-001","ownership":"owner"}' | jq

curl -s -X PUT http://localhost:3000/api/looms/$LOOM_ID/assign \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wagerId":"'$WAGER_USER_ID'"}' | jq

# Create product
curl -s -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Khadi","size":"30x60","category":"single",
    "paavuToPieceRatio":1.0,"paavuConsumptionGrams":150,
    "oodaiConsumptionGrams":200,
    "wageRatePerKg":25.00,"wageRatePerPiece":3.50,
    "stitchRatePerPiece":1.00,"knotRatePerPiece":0.50,
    "smallBundleCount":10,"largeBundleCount":50,
    "bundleRateSmall":5.00,"bundleRateLarge":20.00,
    "gstRatePct":5.00,"colorPricingMode":"per_color"
  }' | jq

# Add color price (Mode 2)
curl -s -X POST http://localhost:3000/api/products/$PRODUCT_ID/color-prices \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"color":"White","sellingPricePerPiece":45.00}' | jq

# Create customer with state code
curl -s -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Kumar Traders","stateCode":"KA","customerType":"wholesale_partial","creditPeriodDays":45}' | jq

# Create godown (main)
curl -s -X POST http://localhost:3000/api/godowns \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Main Warehouse","isMain":true,"godownType":"godown"}' | jq

# List wager profiles
curl -s "http://localhost:3000/api/wagers?wagerType=1" \
  -H "Authorization: Bearer $OWNER_TOKEN" | jq
```

### Integration Tests

| Test ID | Description                                                                       | What It Validates             |
| ------- | --------------------------------------------------------------------------------- | ----------------------------- |
| IT-4.1  | Create loom type -> create loom -> assign wager -> verify chain                   | Loom-to-wager assignment flow |
| IT-4.2  | Create product -> add color prices -> add shift rates -> verify all linked        | Product with sub-entities     |
| IT-4.3  | Create customer with state_code -> verify GST detection ready (state_code stored) | Customer GST readiness        |
| IT-4.4  | Create godown (main + additional) -> verify only one main constraint              | Godown main constraint        |
| IT-4.5  | Create wager user (Phase 1) -> verify profile auto-created with correct defaults  | Auto-created wager profile    |

### Verification Gate

- [ ] All unit tests pass (~90 tests)
- [ ] All integration tests pass (IT-4.1 through IT-4.5, 5 tests)
- [ ] All 9 DB tables created with correct schema
- [ ] RLS policies active on all 9 tables
- [ ] `updated_at` trigger applied to all 9 tables
- [ ] All 30 endpoints responding correctly via curl
- [ ] `db-reviewer` approved all 9 migrations
- [ ] `business-logic-validator` approved all service logic
  - Color pricing mode enforcement (per_color endpoints only when mode='per_color')
  - Shift wage rates only when shift_enabled=true
  - Godown is_main constraint
  - Wager assignment validates role='wager'
  - Wager type CHECK (1-4) enforced
- [ ] `checklist-validator` confirmed coverage:
  - CL-DB-03: 6/6 items complete (Loom Management)
  - CL-DB-04: 11/11 items complete (Product Master)
  - CL-DB-05: 6/6 items complete (Suppliers & Customers)
  - CL-DB-06: 4/4 items complete (Godowns)
  - CL-DB-07: 5/5 items complete (Wager Profiles)
  - CL-BE-04: 14/14 items complete (Master Data)
  - Total Phase 2: 32 CL-DB items + 14 CL-BE items = 46 items
- [ ] Seed data created for all 9 tables with realistic powerloom industry values
- [ ] i18n keys added for all user-facing strings
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint warnings (`pnpm lint`)

---

## Cumulative Progress After Phase 2

### Tables Created: 16

| Phase | Tables | Names                                                                                                              |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| 0     | 0      | (middleware only)                                                                                                  |
| 1     | 6      | tenants, tenant_settings, users, staff_permissions, otp_codes, audit_logs                                          |
| 1b    | 1      | invite_codes                                                                                                       |
| 2     | 9      | loom_types, looms, products, product_color_prices, shift_wage_rates, suppliers, customers, godowns, wager_profiles |

### Endpoints: 59

| Phase | Endpoints | Running Total |
| ----- | --------- | ------------- |
| 0     | 1         | 1             |
| 1     | 20        | 21            |
| 1b    | 8         | 29            |
| 2     | 30        | 59            |

### Checklist Coverage

| Category | Items Done | Total | %   |
| -------- | ---------- | ----- | --- |
| CL-DB    | 53         | 148   | 36% |
| CL-BE    | 32         | 149   | 21% |

### Phase 0 Items: CL-BE-01 (10/10)

### Phase 1 Items: CL-DB-01 (11), CL-DB-02 (10), CL-DB-16 partial (4), CL-BE-02 (10), CL-BE-03 (8) = 43

### Phase 2 Items: CL-DB-03 (6), CL-DB-04 (11), CL-DB-05 (6), CL-DB-06 (4), CL-DB-07 (5), CL-BE-04 (14) = 46

**Total estimated tests:** ~190 unit + ~21 integration = ~211 tests

---

## Next: [06b-core-phases.md](./06b-core-phases.md)

Phases 3-7: Batch System, Inventory & Raw Materials, Production System, Damage Management, Post-Production (Tailoring & Packaging).
