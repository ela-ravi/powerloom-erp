# Backend Plan — Powerloom ERP V3

## Agile Breakdown: Epics, Stories, Tasks, Sub-tasks

**Tech Stack:** Node.js / TypeScript, RESTful API (or tRPC), PostgreSQL (Supabase), JWT auth
**TDD Approach:** Write tests first for every endpoint, service, and middleware. Unit tests per task, integration tests per story/epic.

---

## Epic 1: Project Setup & Foundation

### Story 1.1: Project Initialization

> As a developer, I need the backend project scaffolded with TypeScript, testing framework, and database connectivity.

#### Task 1.1.1: Initialize Node.js TypeScript project

**Sub-tasks:**

- [ ] Write test: verify TypeScript compiles without errors
- [ ] Initialize `package.json` with required scripts (dev, build, test, migrate)
- [ ] Configure `tsconfig.json` with strict mode
- [ ] Set up ESLint + Prettier
- [ ] Configure path aliases (@/routes, @/services, @/db, @/types, @/middleware)
- [ ] Verify tests pass

#### Task 1.1.2: Set up testing framework

**Sub-tasks:**

- [ ] Write test: verify test runner works (trivial test)
- [ ] Install and configure Vitest (or Jest)
- [ ] Set up test database connection (separate test DB)
- [ ] Create test utilities: `createTestTenant()`, `createTestUser()`, `getAuthToken()`
- [ ] Set up test lifecycle hooks (before/after: create/drop test schema)
- [ ] Verify tests pass

#### Task 1.1.3: Set up database connection & migration system

**Sub-tasks:**

- [ ] Write test: verify database connection works
- [ ] Install database client (Drizzle ORM or Kysely)
- [ ] Configure connection pool with SSL support
- [ ] Set up migration runner (reads from `migrations/` directory)
- [ ] Create migration template generator
- [ ] Write test: verify migration up/down cycle works
- [ ] Verify tests pass

#### Task 1.1.4: Set up Express/Fastify server

**Sub-tasks:**

- [ ] Write test: verify server starts and responds to health check
- [ ] Install and configure Express (or Fastify)
- [ ] Set up CORS configuration
- [ ] Set up request body parsing (JSON)
- [ ] Create `GET /api/health` endpoint
- [ ] Set up graceful shutdown
- [ ] Verify tests pass

#### Task 1.1.5: Set up shared types package

**Sub-tasks:**

- [ ] Write test: verify types are importable from shared package
- [ ] Create `packages/shared/` directory for shared types
- [ ] Define base type interfaces: `Tenant`, `User`, `Product`, etc.
- [ ] Export enums: roles, stages, wager types, etc.
- [ ] Configure workspace (npm/yarn/pnpm workspaces)
- [ ] Verify tests pass

---

### Story 1.2: Middleware Infrastructure

> As a developer, I need core middleware for authentication, tenant isolation, error handling, and request validation.

#### Task 1.2.1: Create error handling middleware

**Sub-tasks:**

- [ ] Write test: verify error response format `{ error: { code, message, details? } }`
- [ ] Write test: verify 400 validation errors return field-level details
- [ ] Write test: verify 500 errors don't leak internal details
- [ ] Create `AppError` class with code, status, message
- [ ] Create global error handler middleware
- [ ] Create `asyncHandler` wrapper for route handlers
- [ ] Verify tests pass

#### Task 1.2.2: Create request validation middleware

**Sub-tasks:**

- [ ] Write test: verify valid request passes validation
- [ ] Write test: verify invalid request returns 400 with details
- [ ] Install Zod for schema validation
- [ ] Create `validate(schema)` middleware factory
- [ ] Create reusable Zod schemas for common types (uuid, phone, pagination)
- [ ] Verify tests pass

#### Task 1.2.3: Create authentication middleware

**Sub-tasks:**

- [ ] Write test: request without token returns 401
- [ ] Write test: request with invalid token returns 401
- [ ] Write test: request with expired token returns 401
- [ ] Write test: request with valid token sets `req.user` (id, tenantId, role)
- [ ] Install JWT library (jsonwebtoken)
- [ ] Create `authenticate` middleware — verify JWT, extract user
- [ ] Create token generation utility: `generateToken(user)` → JWT with tenantId, userId, role
- [ ] Create token refresh logic
- [ ] Verify tests pass

#### Task 1.2.4: Create tenant isolation middleware

**Sub-tasks:**

- [ ] Write test: every DB query is scoped to `req.user.tenantId`
- [ ] Write test: super_admin can specify tenant via header
- [ ] Create `tenantScope` middleware — sets `app.current_tenant` in DB session for RLS
- [ ] Create `getTenantId(req)` utility
- [ ] Verify tests pass

#### Task 1.2.5: Create role authorization middleware

**Sub-tasks:**

- [ ] Write test: owner can access owner-only routes
- [ ] Write test: wager cannot access owner-only routes → 403
- [ ] Write test: staff with permission can access restricted routes
- [ ] Write test: staff without permission gets 403
- [ ] Create `authorize(...roles)` middleware factory
- [ ] Create `requirePermission(permission)` middleware for staff granular access
- [ ] Verify tests pass

#### Task 1.2.6: Create request logging middleware

**Sub-tasks:**

- [ ] Write test: verify request logs contain method, path, status, duration
- [ ] Create request logger middleware
- [ ] Configure structured logging (pino or winston)
- [ ] Verify tests pass

---

### Story 1.3: Database Service Layer

> As a developer, I need a service layer that provides tenant-scoped database operations.

#### Task 1.3.1: Create base repository pattern

**Sub-tasks:**

- [ ] Write test: `BaseRepository.findById(id)` returns record scoped to tenant
- [ ] Write test: `BaseRepository.findById(id)` returns null for different tenant's record
- [ ] Write test: `BaseRepository.create(data)` auto-sets tenant_id
- [ ] Write test: `BaseRepository.update(id, data)` only updates own tenant's record
- [ ] Write test: `BaseRepository.softDelete(id)` sets is_active=false
- [ ] Create `BaseRepository<T>` class with tenant-scoped CRUD methods
- [ ] Verify tests pass

#### Task 1.3.2: Create database transaction wrapper

**Sub-tasks:**

- [ ] Write test: verify transaction commits on success
- [ ] Write test: verify transaction rolls back on error
- [ ] Create `withTransaction(callback)` utility
- [ ] Verify tests pass

#### Task 1.3.3: Create audit logging service

**Sub-tasks:**

- [ ] Write test: create operation logs to audit_logs
- [ ] Write test: update operation logs old_values and new_values
- [ ] Write test: delete operation logs old_values
- [ ] Create `AuditService.log(action, entityType, entityId, oldValues?, newValues?)` method
- [ ] Integrate audit logging into BaseRepository
- [ ] Verify tests pass

---

### Integration Test: Epic 1

- [ ] **IT-1.1**: Server starts → health check returns 200
- [ ] **IT-1.2**: Unauthenticated request → 401 → authenticated request → 200
- [ ] **IT-1.3**: Tenant A user cannot access Tenant B data
- [ ] **IT-1.4**: Staff without permission gets 403 on restricted route
- [ ] **IT-1.5**: Error handler formats errors correctly for validation, auth, and server errors
- [ ] **IT-1.6**: Database transaction rolls back on partial failure

---

## Epic 2: Authentication Module

### Story 2.1: Phone OTP Authentication

> As a user, I need to log in using my phone number and an OTP sent via SMS.

#### Task 2.1.1: Create OTP send endpoint

**Endpoint:** `POST /api/auth/otp/send`

**Sub-tasks:**

- [ ] Write test: valid phone → 200, OTP created in DB
- [ ] Write test: invalid phone format → 400
- [ ] Write test: inactive user → 403
- [ ] Write test: OTP not enabled for tenant → 400
- [ ] Write test: rate limiting (max 5 OTPs per phone per hour)
- [ ] Create Zod schema for request body `{ phone: string }`
- [ ] Create `AuthService.sendOTP(phone)` — generate 6-digit OTP, hash, store, send SMS
- [ ] Create SMS service abstraction (pluggable: Twilio, MSG91, etc.)
- [ ] Create route handler
- [ ] Verify tests pass

#### Task 2.1.2: Create OTP verify endpoint

**Endpoint:** `POST /api/auth/otp/verify`

**Sub-tasks:**

- [ ] Write test: valid OTP → 200, returns JWT token + user data
- [ ] Write test: invalid OTP → 401
- [ ] Write test: expired OTP → 401
- [ ] Write test: already used OTP → 401
- [ ] Write test: JWT token contains tenantId, userId, role
- [ ] Create Zod schema for request body `{ phone, code }`
- [ ] Create `AuthService.verifyOTP(phone, code)` — verify hash, check expiry, mark used
- [ ] Create route handler that returns JWT + user profile
- [ ] Verify tests pass

### Story 2.2: PIN Authentication

> As a user in an area with unreliable SMS, I need to log in using my phone number and 4-digit PIN.

#### Task 2.2.1: Create PIN verify endpoint

**Endpoint:** `POST /api/auth/pin/verify`

**Sub-tasks:**

- [ ] Write test: valid phone + PIN → 200, returns JWT
- [ ] Write test: invalid PIN → 401
- [ ] Write test: PIN auth not enabled for tenant → 400
- [ ] Write test: user without PIN set → 400
- [ ] Create Zod schema for request body `{ phone, pin }`
- [ ] Create `AuthService.verifyPIN(phone, pin)` — hash compare
- [ ] Create route handler
- [ ] Verify tests pass

#### Task 2.2.2: Create PIN set/update endpoint

**Endpoint:** `PUT /api/auth/pin`

**Sub-tasks:**

- [ ] Write test: authenticated user can set PIN → 200
- [ ] Write test: PIN must be exactly 4 digits → 400
- [ ] Write test: unauthenticated → 401
- [ ] Create Zod schema `{ pin: string (4 digits) }`
- [ ] Create `AuthService.setPIN(userId, pin)` — hash and store
- [ ] Create route handler (requires authentication)
- [ ] Verify tests pass

### Story 2.3: Token Management

> As a system, I need token refresh and session management.

#### Task 2.3.1: Create token refresh endpoint

**Endpoint:** `POST /api/auth/refresh`

**Sub-tasks:**

- [ ] Write test: valid refresh token → new access token
- [ ] Write test: expired refresh token → 401
- [ ] Create refresh token logic (longer-lived token)
- [ ] Create route handler
- [ ] Verify tests pass

#### Task 2.3.2: Create get current user endpoint

**Endpoint:** `GET /api/auth/me`

**Sub-tasks:**

- [ ] Write test: returns current user profile with role and permissions
- [ ] Write test: includes tenant settings (feature flags)
- [ ] Create route handler
- [ ] Verify tests pass

---

### Integration Test: Epic 2

- [ ] **IT-2.1**: Full OTP flow: send → verify → receive JWT → access protected route
- [ ] **IT-2.2**: Full PIN flow: set PIN → login with PIN → access route
- [ ] **IT-2.3**: Token refresh cycle: login → access token expires → refresh → continue
- [ ] **IT-2.4**: OTP rate limiting prevents brute force
- [ ] **IT-2.5**: Auth method disabled at tenant level → rejected
- [ ] **IT-2.6**: Login returns correct tenant feature flags

---

## Epic 3: Tenant & User Management Module

### Story 3.1: Tenant Management (Super Admin)

> As a super admin, I need to create and manage tenant accounts.

#### Task 3.1.1: Create tenant CRUD endpoints

**Endpoints:**

- `POST /api/tenants` — Create tenant
- `GET /api/tenants` — List tenants (paginated)
- `GET /api/tenants/:id` — Get tenant details
- `PUT /api/tenants/:id` — Update tenant
- `PUT /api/tenants/:id/status` — Update status

**Sub-tasks:**

- [ ] Write test: super_admin can create tenant → 201
- [ ] Write test: non-super_admin → 403
- [ ] Write test: create tenant auto-creates tenant_settings
- [ ] Write test: list tenants with pagination (limit, offset)
- [ ] Write test: update tenant status (active/suspended/trial)
- [ ] Create Zod schemas for each endpoint
- [ ] Create `TenantService` with CRUD methods
- [ ] Create `TenantRepository` extending BaseRepository
- [ ] Create route handlers
- [ ] Verify tests pass

#### Task 3.1.2: Create tenant settings endpoints

**Endpoints:**

- `GET /api/tenants/:id/settings`
- `PUT /api/tenants/:id/settings`

**Sub-tasks:**

- [ ] Write test: owner can read/update own tenant settings
- [ ] Write test: update batch_enabled flag
- [ ] Write test: update shift_enabled flag
- [ ] Write test: update wage_cycle_day (0-6 validation)
- [ ] Write test: update damage deduction rates
- [ ] Create Zod schema for settings update
- [ ] Create `TenantSettingsService`
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 3.2: User Management (Owner/Admin)

> As an owner, I need to create and manage users within my tenant.

#### Task 3.2.1: Create user CRUD endpoints

**Endpoints:**

- `POST /api/users` — Create user
- `GET /api/users` — List users (paginated, filterable by role)
- `GET /api/users/:id` — Get user
- `PUT /api/users/:id` — Update user
- `PUT /api/users/:id/deactivate` — Soft deactivate

**Sub-tasks:**

- [ ] Write test: owner can create user with any role → 201
- [ ] Write test: creating wager auto-creates wager_profile
- [ ] Write test: duplicate phone in same tenant → 409
- [ ] Write test: same phone in different tenant → 201 (allowed)
- [ ] Write test: filter users by role
- [ ] Write test: staff can only manage if has 'master_data' permission
- [ ] Write test: wager/tailor/packager cannot create users → 403
- [ ] Create Zod schemas
- [ ] Create `UserService` with CRUD + wager profile auto-creation
- [ ] Create `UserRepository`
- [ ] Create route handlers
- [ ] Verify tests pass

#### Task 3.2.2: Create staff permission endpoints

**Endpoints:**

- `GET /api/users/:id/permissions`
- `PUT /api/users/:id/permissions` — Set permissions (replace all)

**Sub-tasks:**

- [ ] Write test: owner can set staff permissions
- [ ] Write test: permissions validated against allowed list
- [ ] Write test: non-staff user cannot have permissions → 400
- [ ] Create Zod schema for permissions array
- [ ] Create `PermissionService`
- [ ] Create route handlers
- [ ] Verify tests pass

---

### Integration Test: Epic 3

- [ ] **IT-3.1**: Create tenant → create owner user → login → create staff → assign permissions → staff can access permitted routes
- [ ] **IT-3.2**: Create wager user → verify wager_profile auto-created
- [ ] **IT-3.3**: Deactivate user → verify login fails
- [ ] **IT-3.4**: Tenant settings update → feature flags affect downstream APIs

---

## Epic 4: Master Data Module

### Story 4.1: Loom Type & Loom Management

> As an owner, I need CRUD endpoints for loom types and individual looms.

#### Task 4.1.1: Create loom type CRUD endpoints

**Endpoints:** `POST/GET/PUT /api/loom-types`

**Sub-tasks:**

- [ ] Write test: owner can create loom type → 201
- [ ] Write test: duplicate name in tenant → 409
- [ ] Write test: capacity must be positive integer → 400
- [ ] Write test: list loom types returns tenant-scoped results
- [ ] Create Zod schemas, service, repository, routes
- [ ] Verify tests pass

#### Task 4.1.2: Create loom CRUD endpoints

**Endpoints:** `POST/GET/PUT /api/looms`, `PUT /api/looms/:id/assign`

**Sub-tasks:**

- [ ] Write test: create loom with loom_type_id → 201
- [ ] Write test: assign wager to loom → 200
- [ ] Write test: assign non-wager user → 400
- [ ] Write test: loom_number unique per tenant → 409
- [ ] Write test: update maintenance_status
- [ ] Write test: filter looms by type, status, assigned wager
- [ ] Create Zod schemas, service, repository, routes
- [ ] Verify tests pass

### Story 4.2: Product Master Management

> As an owner, I need to create and manage product definitions with all manufacturing parameters.

#### Task 4.2.1: Create product CRUD endpoints

**Endpoints:** `POST/GET/PUT /api/products`

**Sub-tasks:**

- [ ] Write test: create product with all fields → 201
- [ ] Write test: duplicate (name, size) in tenant → 409
- [ ] Write test: all rate fields accept valid decimals
- [ ] Write test: category enum validation
- [ ] Write test: color_pricing_mode affects required fields
- [ ] Write test: list with filters (category, is_active)
- [ ] Create Zod schema (large schema with all product fields)
- [ ] Create `ProductService`, `ProductRepository`
- [ ] Create route handlers
- [ ] Verify tests pass

#### Task 4.2.2: Create product color price endpoints

**Endpoints:** `POST/GET/PUT/DELETE /api/products/:id/color-prices`

**Sub-tasks:**

- [ ] Write test: add color price → 201
- [ ] Write test: duplicate (product, color) → 409
- [ ] Write test: only accessible when color_pricing_mode='per_color'
- [ ] Create Zod schemas, service, routes
- [ ] Verify tests pass

#### Task 4.2.3: Create shift wage rate endpoints

**Endpoints:** `POST/GET/PUT /api/products/:id/shift-rates`

**Sub-tasks:**

- [ ] Write test: create shift rate → 201
- [ ] Write test: only accessible when tenant shift_enabled=true → 400 otherwise
- [ ] Write test: duplicate (product, shift) → 409
- [ ] Create Zod schemas, service, routes
- [ ] Verify tests pass

### Story 4.3: Supplier, Customer & Godown Management

> As an owner, I need CRUD endpoints for suppliers, customers, and godowns.

#### Task 4.3.1: Create supplier CRUD endpoints

**Endpoints:** `POST/GET/PUT /api/suppliers`

**Sub-tasks:**

- [ ] Write test: standard CRUD operations
- [ ] Write test: tenant scoping
- [ ] Create Zod schemas, service, repository, routes
- [ ] Verify tests pass

#### Task 4.3.2: Create customer CRUD endpoints

**Endpoints:** `POST/GET/PUT /api/customers`

**Sub-tasks:**

- [ ] Write test: create with all 3 customer types → 201
- [ ] Write test: state_code is required → 400
- [ ] Write test: credit_period_days defaults to 30
- [ ] Write test: outstanding_balance initialized to 0
- [ ] Write test: list with filters (type, is_active)
- [ ] Create Zod schemas, service, repository, routes
- [ ] Verify tests pass

#### Task 4.3.3: Create godown CRUD endpoints

**Endpoints:** `POST/GET/PUT /api/godowns`

**Sub-tasks:**

- [ ] Write test: create godown → 201
- [ ] Write test: only one main godown per tenant
- [ ] Write test: godown_type (godown/paavu_pattarai) validation
- [ ] Write test: list godowns with type filter
- [ ] Create Zod schemas, service, repository, routes
- [ ] Verify tests pass

### Story 4.4: Wager Profile Management

> As an owner, I need to manage wager profiles with type-specific configuration.

#### Task 4.4.1: Create wager profile endpoints

**Endpoints:** `POST/GET/PUT /api/wagers`, `GET /api/wagers/:id`

**Sub-tasks:**

- [ ] Write test: wager profile auto-created on wager user creation (from Story 3.2)
- [ ] Write test: get wager profile includes advance balance
- [ ] Write test: update wager_type validates (1-4)
- [ ] Write test: list wagers with filters (type, is_active)
- [ ] Write test: wager can read own profile via `GET /api/wagers/me`
- [ ] Create Zod schemas, service, repository, routes
- [ ] Verify tests pass

---

### Integration Test: Epic 4

- [ ] **IT-4.1**: Create loom type → create loom → assign wager → verify chain
- [ ] **IT-4.2**: Create product → add color prices → add shift rates → verify all linked
- [ ] **IT-4.3**: Create customer with state_code → verify GST detection ready
- [ ] **IT-4.4**: Create godown (main + additional) → verify constraints
- [ ] **IT-4.5**: Create wager user → verify profile auto-created with correct defaults

---

## Epic 5: Batch Management Module

### Story 5.1: Batch CRUD & Lifecycle

> As an owner, I need to create, manage, and track production batches.

#### Task 5.1.1: Create batch CRUD endpoints

**Endpoints:** `POST/GET/PUT /api/batches`

**Sub-tasks:**

- [ ] Write test: create batch → 201 (only when batch_enabled=true)
- [ ] Write test: create batch when batch_enabled=false → 400
- [ ] Write test: batch_number auto-generated unique per tenant
- [ ] Write test: batch links to product correctly
- [ ] Write test: list batches with filters (status, product)
- [ ] Create Zod schemas, `BatchService`, `BatchRepository`
- [ ] Create route handlers
- [ ] Verify tests pass

#### Task 5.1.2: Create batch lifecycle endpoints

**Endpoints:** `PUT /api/batches/:id/status`

**Sub-tasks:**

- [ ] Write test: status transitions: open → in_progress → closed
- [ ] Write test: closed batch can be reopened → open
- [ ] Write test: invalid status transition → 400
- [ ] Write test: batch cannot be deleted if has linked production
- [ ] Create status transition logic in `BatchService`
- [ ] Create route handler
- [ ] Verify tests pass

---

### Integration Test: Epic 5

- [ ] **IT-5.1**: Create batch → update status through lifecycle → close → reopen
- [ ] **IT-5.2**: Verify batch endpoints return 400 when batch_enabled=false

---

## Epic 6: Inventory & Raw Material Module

### Story 6.1: Cone Purchase

> As an owner, I need to record cone purchases and update raw material inventory.

#### Task 6.1.1: Create cone purchase endpoints

**Endpoints:** `POST/GET /api/cone-purchases`

**Sub-tasks:**

- [ ] Write test: create cone purchase → 201, inventory updated (raw_cone stage)
- [ ] Write test: total_cost auto-calculated (weight \* cost_per_kg)
- [ ] Write test: gst_amount auto-calculated
- [ ] Write test: batch_id required when batch_enabled=true → 400 if missing
- [ ] Write test: batch_id ignored when batch_enabled=false
- [ ] Write test: inventory_movement record created (type='in')
- [ ] Create Zod schema, `ConePurchaseService` (with transaction: insert purchase + update inventory)
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 6.2: Inventory Queries

> As an owner/staff, I need to view inventory across godowns, stages, products, and colors.

#### Task 6.2.1: Create inventory query endpoints

**Endpoints:**

- `GET /api/inventory` — List with filters (godown, product, color, stage, batch)
- `GET /api/inventory/summary` — Aggregated by stage
- `GET /api/inventory/:id/movements` — Movement history

**Sub-tasks:**

- [ ] Write test: query inventory by godown_id
- [ ] Write test: query inventory by stage
- [ ] Write test: query inventory by product + color
- [ ] Write test: summary returns totals per stage
- [ ] Write test: movement history returns chronological log
- [ ] Write test: batch filter works when batch_enabled
- [ ] Create `InventoryService`, `InventoryRepository`
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 6.3: Inter-Godown Transfers

> As an owner/staff, I need to transfer stock between godowns.

#### Task 6.3.1: Create transfer endpoints

**Endpoints:** `POST /api/transfers`, `GET /api/transfers`

**Sub-tasks:**

- [ ] Write test: create transfer → 201 (only when inter_godown_transfer_enabled=true)
- [ ] Write test: source inventory decreases, destination inventory increases
- [ ] Write test: source != destination validation
- [ ] Write test: insufficient stock → 400
- [ ] Write test: batch_id preserved in transfer
- [ ] Write test: inventory_movements created for both sides
- [ ] Write test: transfer disabled → 400
- [ ] Create Zod schema, `TransferService` (with transaction)
- [ ] Create route handlers
- [ ] Verify tests pass

---

### Integration Test: Epic 6

- [ ] **IT-6.1**: Cone purchase → verify raw_cone inventory increases → verify movement logged
- [ ] **IT-6.2**: Multiple cone purchases → query inventory with filters → verify totals
- [ ] **IT-6.3**: Transfer between godowns → verify both inventories updated → verify movements

---

## Epic 7: Production Module

### Story 7.1: Cone Issuance

> As an owner/staff, I need to issue cones to wagers for production.

#### Task 7.1.1: Create cone issuance endpoints

**Endpoints:** `POST/GET /api/cone-issuances`

**Sub-tasks:**

- [ ] Write test: issue cone → 201, raw_cone inventory decreases
- [ ] Write test: insufficient cone stock → 400
- [ ] Write test: batch_id required when batch_enabled
- [ ] Write test: one issuance per batch for traceability
- [ ] Write test: wager_id validated (must be active wager)
- [ ] Write test: color validated against available stock
- [ ] Write test: inventory_movement created (type='out')
- [ ] Create Zod schema, `ConeIssuanceService` (with transaction)
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 7.2: Paavu Production

> As an owner/staff, I need to record Paavu production in the Paavu Pattarai.

#### Task 7.2.1: Create paavu production endpoints

**Endpoints:** `POST/GET /api/paavu-productions`

**Sub-tasks:**

- [ ] Write test: record paavu production → 201
- [ ] Write test: cone inventory decreases, paavu inventory increases
- [ ] Write test: wastage_flag auto-set when wastage > tenant limit
- [ ] Write test: wastage within limit → no flag
- [ ] Write test: paavu_oati_id must reference valid user
- [ ] Write test: batch_id handling (conditional)
- [ ] Create Zod schema, `PaavuProductionService` (with transaction + wastage check)
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 7.3: Production Return

> As an owner/staff, I need to record production returns from wagers.

#### Task 7.3.1: Create production return endpoints

**Endpoints:** `POST/GET /api/production-returns`

**Sub-tasks:**

- [ ] Write test: Type 1/3 wager → return_weight_kg required, return_count optional
- [ ] Write test: Type 2/4 wager → return_count required, return_weight_kg optional
- [ ] Write test: Type 1/3 missing weight → 400
- [ ] Write test: Type 2/4 missing count → 400
- [ ] Write test: production return → woven inventory increases
- [ ] Write test: wastage validation (per wager type: 1kg for Type 1/3, 500g for Type 2/4)
- [ ] Write test: wastage exceeds limit → wastage_flag=true
- [ ] Write test: shift field accepted only when shift_enabled
- [ ] Write test: shift field rejected when shift_disabled → ignored or 400
- [ ] Write test: color substitution detection (return color != issued color → fraud alert)
- [ ] Write test: batch_id handling
- [ ] Write test: inventory_movement created
- [ ] Create Zod schema (dynamic validation based on wager type)
- [ ] Create `ProductionReturnService` (with transaction + validations + fraud detection)
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 7.4: Loom Downtime

> As an owner or wager, I need to record and view loom downtime.

#### Task 7.4.1: Create loom downtime endpoints

**Endpoints:** `POST/GET/PUT /api/loom-downtimes`

**Sub-tasks:**

- [ ] Write test: owner can create downtime → 201
- [ ] Write test: wager can create downtime for own loom → 201
- [ ] Write test: wager cannot create for other's loom → 403
- [ ] Write test: reason enum validation (4 values)
- [ ] Write test: custom_reason only when reason='other'
- [ ] Write test: downtime_days calculated from dates
- [ ] Write test: end_date optional (ongoing downtime)
- [ ] Create Zod schema, `DowntimeService`, routes
- [ ] Verify tests pass

### Story 7.5: Shift Management

> As an owner, I need to configure production shifts (when shift tracking is enabled).

#### Task 7.5.1: Create shift CRUD endpoints

**Endpoints:** `POST/GET/PUT /api/shifts`

**Sub-tasks:**

- [ ] Write test: create shift → 201 (only when shift_enabled=true)
- [ ] Write test: shift_disabled → 400
- [ ] Write test: shift times validation
- [ ] Create Zod schema, `ShiftService`, routes
- [ ] Verify tests pass

### Story 7.6: Performance & Ranking

> As an owner, I need to see wager performance metrics and rankings.

#### Task 7.6.1: Create performance endpoints

**Endpoints:**

- `GET /api/wagers/:id/performance` — Individual wager performance
- `GET /api/wagers/ranking` — All wager ranking

**Sub-tasks:**

- [ ] Write test: performance returns capacity utilization %
- [ ] Write test: performance adjusts for recorded downtime
- [ ] Write test: ranking sorted by utilization % descending
- [ ] Write test: ranking hidden from wagers when show_wager_ranking=false
- [ ] Write test: ranking visible to wagers when show_wager_ranking=true
- [ ] Write test: performance formula = (actual / (capacity _ (working_days - downtime))) _ 100
- [ ] Create `PerformanceService` (computed, no table — aggregates from production_returns + loom_types + downtimes)
- [ ] Create route handlers
- [ ] Verify tests pass

---

### Integration Test: Epic 7

- [ ] **IT-7.1**: Cone purchase → cone issuance → production return → verify full pipeline inventory transitions
- [ ] **IT-7.2**: Paavu production → verify inventory transitions (cone → paavu)
- [ ] **IT-7.3**: Type 1 wager full flow: issue cone → return by weight → wage calculated per kg
- [ ] **IT-7.4**: Type 2 wager full flow: issue cone → return by count → wage calculated per piece
- [ ] **IT-7.5**: Return with wrong color → fraud alert created
- [ ] **IT-7.6**: Downtime recorded → performance adjusted → ranking updated
- [ ] **IT-7.7**: Shift-based production return (when enabled) → shift wage rate applied

---

## Epic 8: Damage Management Module

### Story 8.1: Damage Recording & Approval

> As an owner/staff, I need to record damage with grading and get owner approval before deductions.

#### Task 8.1.1: Create damage record endpoints

**Endpoints:**

- `POST /api/damage-records`
- `GET /api/damage-records` (filterable by wager, grade, status, detection point)
- `GET /api/damage-records/:id`

**Sub-tasks:**

- [ ] Write test: record damage → 201 with status='pending'
- [ ] Write test: detection_point enum validation (4 values)
- [ ] Write test: grade enum validation (minor/major/reject)
- [ ] Write test: deduction_rate_pct auto-populated from tenant_settings based on grade
- [ ] Write test: total*deduction auto-calculated (count * cost \_ rate%)
- [ ] Write test: production_cost_per_piece calculated (material + wage cost)
- [ ] Write test: wager_id set from production_return traceability
- [ ] Write test: miscellaneous damage (wager_id=NULL, is_miscellaneous=true)
- [ ] Write test: wager can see only own damage records
- [ ] Create Zod schema, `DamageService`, `DamageRepository`
- [ ] Create route handlers
- [ ] Verify tests pass

#### Task 8.1.2: Create damage approval endpoint

**Endpoint:** `PUT /api/damage-records/:id/approve`, `PUT /api/damage-records/:id/reject`

**Sub-tasks:**

- [ ] Write test: owner can approve → status='approved', sets approved_by, approved_at
- [ ] Write test: owner can reject → status='rejected'
- [ ] Write test: non-owner → 403
- [ ] Write test: already approved/rejected → 400
- [ ] Write test: approval does NOT immediately deduct from wage (deduction happens at wage cycle)
- [ ] Create `DamageApprovalService`
- [ ] Create route handlers
- [ ] Verify tests pass

---

### Integration Test: Epic 8

- [ ] **IT-8.1**: Production return → record damage → approve → verify deduction ready for wage cycle
- [ ] **IT-8.2**: Damage at different detection points → verify all 4 work
- [ ] **IT-8.3**: Miscellaneous damage → verify no wager link, no deduction
- [ ] **IT-8.4**: Reject damage → verify no deduction applied

---

## Epic 9: Post-Production Module (Tailoring & Packaging)

### Story 9.1: Tailoring

> As an owner/staff, I need to record tailoring work and calculate tailor wages.

#### Task 9.1.1: Create tailoring record endpoints

**Endpoints:** `POST/GET /api/tailoring-records`

**Sub-tasks:**

- [ ] Write test: create record → 201 with auto-calculated wages
- [ ] Write test: stitch_wage = stitch_count \* product.stitch_rate_per_piece
- [ ] Write test: knot_wage = knot_count \* product.knot_rate_per_piece
- [ ] Write test: total_wage = stitch_wage + knot_wage
- [ ] Write test: inventory transition: woven → tailored
- [ ] Write test: insufficient woven stock → 400
- [ ] Write test: mismatch_flag set when count exceeds available woven stock
- [ ] Write test: tailor can see only own records
- [ ] Write test: batch_id handling
- [ ] Create Zod schema, `TailoringService` (with transaction + inventory update)
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 9.2: Packaging

> As an owner/staff, I need to record packaging work and calculate packager wages.

#### Task 9.2.1: Create packaging record endpoints

**Endpoints:** `POST/GET /api/packaging-records`

**Sub-tasks:**

- [ ] Write test: create record → 201 with auto-calculated values
- [ ] Write test: pieces_per_bundle from product master (small or large)
- [ ] Write test: total_pieces = bundle_count \* pieces_per_bundle
- [ ] Write test: wage_per_bundle from product master (bundle_rate_small or bundle_rate_large)
- [ ] Write test: total_wage = bundle_count \* wage_per_bundle
- [ ] Write test: inventory transition: tailored → bundled
- [ ] Write test: insufficient tailored stock → 400
- [ ] Write test: packager can see only own records
- [ ] Create Zod schema, `PackagingService` (with transaction + inventory update)
- [ ] Create route handlers
- [ ] Verify tests pass

---

### Integration Test: Epic 9

- [ ] **IT-9.1**: Woven stock → tailoring → tailored stock → packaging → bundled stock
- [ ] **IT-9.2**: Verify wage calculations for tailor and packager
- [ ] **IT-9.3**: Insufficient stock at each stage → proper error
- [ ] **IT-9.4**: Batch traceability through tailoring and packaging

---

## Epic 10: Wage & Advance Management Module

### Story 10.1: Advance Management

> As an owner, I need to issue advances to wagers and track the running balance.

#### Task 10.1.1: Create advance endpoints

**Endpoints:**

- `POST /api/advances` — Issue advance
- `GET /api/advances` — List advance transactions
- `GET /api/wagers/:id/advance-balance` — Get current balance

**Sub-tasks:**

- [ ] Write test: issue advance → 201, balance increases
- [ ] Write test: balance_after snapshot correct
- [ ] Write test: wager_profile.advance_balance updated
- [ ] Write test: wager_profile.original_advance updated on first advance
- [ ] Write test: transaction history returns chronological list
- [ ] Write test: wager can view own advance balance
- [ ] Create Zod schema, `AdvanceService` (with transaction)
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 10.2: Wage Cycle Management

> As an owner, I need weekly wage cycles that auto-calculate everything.

#### Task 10.2.1: Create wage cycle endpoints

**Endpoints:**

- `POST /api/wage-cycles/generate` — Auto-generate current cycle
- `GET /api/wage-cycles` — List cycles
- `GET /api/wage-cycles/:id` — Get cycle with all wage records
- `PUT /api/wage-cycles/:id/review` — Move to review
- `PUT /api/wage-cycles/:id/approve` — Approve cycle
- `PUT /api/wage-cycles/:id/pay` — Mark as paid

**Sub-tasks:**

- [ ] Write test: generate cycle creates wage_records for all active workers
- [ ] Write test: wager gross_wage = sum(production_returns \* rate) for the week
- [ ] Write test: wager gross_wage uses per-kg rate for Type 1/3
- [ ] Write test: wager gross_wage uses per-piece rate for Type 2/4
- [ ] Write test: shift-specific rates used when shift_enabled
- [ ] Write test: tailor gross_wage = sum(tailoring_records.total_wage) for the week
- [ ] Write test: packager gross_wage = sum(packaging_records.total_wage) for the week
- [ ] Write test: paavu_oati gross_wage = sum(paavu_productions.paavu_count \* rate) for the week
- [ ] Write test: advance_deduction applied (configurable amount per cycle)
- [ ] Write test: damage_deduction = sum(approved damages for the week)
- [ ] Write test: net_payable = gross - advance - damage
- [ ] Write test: status workflow: draft → review → approved → paid
- [ ] Write test: invalid status transition → 400
- [ ] Create Zod schemas, `WageCycleService` (complex calculation logic)
- [ ] Create route handlers
- [ ] Verify tests pass

#### Task 10.2.2: Create discretionary payment logic

**Sub-tasks:**

- [ ] Write test: when net_payable <= 0, owner can set discretionary_amount
- [ ] Write test: discretionary_amount added to wager advance_balance
- [ ] Write test: advance_transaction created with type='discretionary_addition'
- [ ] Write test: actual_paid = max(net_payable, 0) + discretionary_amount
- [ ] Create logic in `WageCycleService`
- [ ] Verify tests pass

#### Task 10.2.3: Create wager self-service wage view

**Endpoint:** `GET /api/wagers/me/wages`

**Sub-tasks:**

- [ ] Write test: wager can see own wage history
- [ ] Write test: wage breakdown includes gross, deductions, net
- [ ] Write test: wager cannot see other wagers' wages
- [ ] Create route handler with RLS-filtered query
- [ ] Verify tests pass

---

### Integration Test: Epic 10

- [ ] **IT-10.1**: Issue advance → generate wage cycle → advance deducted → balance decreases
- [ ] **IT-10.2**: Full cycle: production + damage + advance → verify net_payable formula
- [ ] **IT-10.3**: Negative net → discretionary pay → advance balance increases
- [ ] **IT-10.4**: Multi-worker-type cycle: wager + tailor + packager + paavu_oati wages
- [ ] **IT-10.5**: Shift-based wage rates applied correctly
- [ ] **IT-10.6**: Status workflow: draft → review → approved → paid
- [ ] **IT-10.7**: Wager self-service view shows correct data

---

## Epic 11: Sales & Finance Module

### Story 11.1: Invoice Generation

> As an owner, I need to create GST-compliant invoices with automatic tax detection.

#### Task 11.1.1: Create invoice endpoints

**Endpoints:**

- `POST /api/invoices` — Create invoice with items
- `GET /api/invoices` — List (filterable by customer, status, date range)
- `GET /api/invoices/:id` — Get invoice with items
- `PUT /api/invoices/:id` — Update draft invoice
- `PUT /api/invoices/:id/issue` — Issue invoice (draft → issued)
- `PUT /api/invoices/:id/cancel` — Cancel invoice

**Sub-tasks:**

- [ ] Write test: create invoice → 201 with auto-generated invoice_number
- [ ] Write test: tax_type auto-detected (intra_state vs inter_state)
- [ ] Write test: intra-state → cgst = sgst = subtotal \* (gst_rate / 2 / 100)
- [ ] Write test: inter-state → igst = subtotal \* (gst_rate / 100)
- [ ] Write test: due_date = invoice_date + customer.credit_period_days
- [ ] Write test: subtotal = sum(line_totals)
- [ ] Write test: total_amount = subtotal + tax
- [ ] Write test: balance_due = total_amount (initial)
- [ ] Write test: line_total = quantity \* unit_price
- [ ] Write test: gst_rate_pct snapshot from product at creation time
- [ ] Write test: invoice with multiple items → correct totals
- [ ] Write test: color pricing Mode 1 → average price
- [ ] Write test: color pricing Mode 2 → per-color price from product_color_prices
- [ ] Write test: inventory moves to 'sold' stage on issue
- [ ] Write test: customer.outstanding_balance increases on issue
- [ ] Write test: batch_id on items (when batch_enabled)
- [ ] Create Zod schema (invoice + items), `InvoiceService` (with transaction)
- [ ] Create route handlers
- [ ] Verify tests pass

#### Task 11.1.2: Create E-way bill export

**Endpoint:** `GET /api/invoices/:id/eway-bill`

**Sub-tasks:**

- [ ] Write test: returns JSON in E-way bill format
- [ ] Write test: only for invoices above threshold
- [ ] Create E-way bill JSON formatter
- [ ] Create route handler
- [ ] Verify tests pass

### Story 11.2: Payment Management

> As an owner, I need to record payments and track outstanding balances.

#### Task 11.2.1: Create payment endpoints

**Endpoints:**

- `POST /api/payments` — Record payment
- `GET /api/payments` — List payments (filterable by customer, date)
- `GET /api/customers/:id/statement` — Customer account statement

**Sub-tasks:**

- [ ] Write test: partial payment → invoice amount_paid updated, balance_due decreased
- [ ] Write test: full payment → invoice status='paid'
- [ ] Write test: payment amount > balance_due → 400
- [ ] Write test: customer outstanding_balance decreases
- [ ] Write test: payment_method enum validation (5 values)
- [ ] Write test: customer statement shows invoices + payments chronologically
- [ ] Write test: wholesale_partial customer can make partial payments
- [ ] Write test: wholesale_bill_to_bill customer must pay full invoice
- [ ] Create Zod schema, `PaymentService` (with transaction)
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 11.3: Credit & Overdue Management

> As a system, I need to detect overdue invoices and trigger notifications.

#### Task 11.3.1: Create overdue detection service

**Sub-tasks:**

- [ ] Write test: overdue detection finds invoices past due_date with balance > 0
- [ ] Write test: approaching due notification (configurable days before)
- [ ] Write test: on-due-date notification
- [ ] Write test: overdue notification
- [ ] Write test: invoice status auto-updated to 'overdue'
- [ ] Create `OverdueService` (scheduled job or on-demand check)
- [ ] Integrate with notification system
- [ ] Verify tests pass

#### Task 11.3.2: Create aging report endpoint

**Endpoint:** `GET /api/reports/customer-aging`

**Sub-tasks:**

- [ ] Write test: returns aging buckets (0-30, 30-60, 60-90, 90+)
- [ ] Write test: totals per bucket
- [ ] Write test: per-customer breakdown
- [ ] Create `AgingReportService`
- [ ] Create route handler
- [ ] Verify tests pass

---

### Integration Test: Epic 11

- [ ] **IT-11.1**: Create invoice → auto-detect GST → verify tax split → issue → inventory to sold
- [ ] **IT-11.2**: Partial payment → verify balance → full payment → status=paid
- [ ] **IT-11.3**: Invoice past due → overdue detected → notification created
- [ ] **IT-11.4**: Customer statement → correct chronological view
- [ ] **IT-11.5**: Aging report → correct bucket distribution
- [ ] **IT-11.6**: Bill-to-bill customer → partial payment rejected

---

## Epic 12: Notification & Alert Module

### Story 12.1: Notification System

> As a system, I need to create and manage notifications for users.

#### Task 12.1.1: Create notification endpoints

**Endpoints:**

- `GET /api/notifications` — List (paginated, filterable by read/unread)
- `GET /api/notifications/unread-count` — Badge count
- `PUT /api/notifications/:id/read` — Mark as read
- `PUT /api/notifications/read-all` — Mark all as read

**Sub-tasks:**

- [ ] Write test: list returns only current user's notifications
- [ ] Write test: unread-count returns correct count
- [ ] Write test: mark as read → is_read=true, read_at set
- [ ] Write test: mark all as read
- [ ] Create `NotificationService`
- [ ] Create route handlers
- [ ] Verify tests pass

#### Task 12.1.2: Create notification trigger service

**Sub-tasks:**

- [ ] Write test: credit due approaching → notification created for owner
- [ ] Write test: credit overdue → notification for owner + accountant
- [ ] Write test: wage cycle ready → notification for owner
- [ ] Write test: wage approved/paid → notification for worker
- [ ] Write test: damage reported → notification for owner
- [ ] Write test: fraud alert → notification for owner
- [ ] Write test: production return → notification for owner/staff
- [ ] Write test: advance balance low → notification for wager
- [ ] Write test: downtime reported → notification for owner
- [ ] Write test: inventory mismatch → notification for owner + godown staff
- [ ] Create `NotificationTriggerService` — called from other services
- [ ] Create FCM push notification integration
- [ ] Verify tests pass

### Story 12.2: Fraud Detection Engine

> As a system, I need to detect anomalies and create fraud alerts.

#### Task 12.2.1: Create fraud detection service

**Sub-tasks:**

- [ ] Write test: color substitution detected → alert created
- [ ] Write test: excess wastage detected → alert created
- [ ] Write test: underproduction detected → alert created
- [ ] Write test: high damage % detected → alert created
- [ ] Write test: loom inefficiency detected → alert created
- [ ] Write test: inventory mismatch detected → alert created
- [ ] Write test: customer overdue detected → alert created
- [ ] Create `FraudDetectionService` (called from relevant services + scheduled checks)
- [ ] Verify tests pass

#### Task 12.2.2: Create fraud alert endpoints

**Endpoints:**

- `GET /api/fraud-alerts` — List (owner + authorized staff only)
- `PUT /api/fraud-alerts/:id/resolve` — Resolve alert

**Sub-tasks:**

- [ ] Write test: owner can view alerts
- [ ] Write test: authorized staff can view alerts
- [ ] Write test: wager/tailor/packager cannot view → 403
- [ ] Write test: resolve sets is_resolved=true
- [ ] Create route handlers
- [ ] Verify tests pass

---

### Integration Test: Epic 12

- [ ] **IT-12.1**: Business event → notification created → user reads → mark as read
- [ ] **IT-12.2**: All 11 notification event types → correct recipients
- [ ] **IT-12.3**: All 7 fraud alert types → detected and created
- [ ] **IT-12.4**: Fraud alert access control → role-based visibility

---

## Epic 13: Reports Module

### Story 13.1: Production Reports

#### Task 13.1.1: Create production report endpoints

**Endpoints:**

- `GET /api/reports/production-summary` — Daily/weekly/monthly
- `GET /api/reports/batch-profitability` — Per batch (when batch_enabled)
- `GET /api/reports/color-profitability` — Per color
- `GET /api/reports/product-profitability` — Per product

**Sub-tasks:**

- [ ] Write test: production summary returns correct aggregation by period
- [ ] Write test: batch profitability = revenue - (material + wage) per batch
- [ ] Write test: color profitability aggregation
- [ ] Write test: product profitability aggregation
- [ ] Write test: batch report only when batch_enabled → 400 otherwise
- [ ] Create `ProductionReportService`
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 13.2: Wager Reports

#### Task 13.2.1: Create wager report endpoints

**Endpoints:**

- `GET /api/reports/wage-sheet/:cycleId` — Weekly wage sheet
- `GET /api/reports/wager-damage` — Damage % per wager
- `GET /api/reports/wager-utilization` — Capacity utilization
- `GET /api/reports/wager-advance` — Advance balance per wager

**Sub-tasks:**

- [ ] Write test: wage sheet returns all workers for a cycle
- [ ] Write test: damage % = damaged / total returned per wager
- [ ] Write test: utilization % calculation with downtime adjustment
- [ ] Write test: advance balance per wager list
- [ ] Create `WagerReportService`
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 13.3: Inventory & Finance Reports

#### Task 13.3.1: Create inventory report endpoints

**Endpoints:**

- `GET /api/reports/cone-stock` — By color, godown
- `GET /api/reports/paavu-stock` — Paavu inventory
- `GET /api/reports/finished-stock` — By stage
- `GET /api/reports/stock-movement` — Movement history

**Sub-tasks:**

- [ ] Write test: each report returns correct data
- [ ] Create `InventoryReportService`
- [ ] Create route handlers
- [ ] Verify tests pass

#### Task 13.3.2: Create finance report endpoints

**Endpoints:**

- `GET /api/reports/gst-summary` — CGST/SGST/IGST breakup
- `GET /api/reports/customer-aging` — (already in Epic 11)
- `GET /api/reports/supplier-ledger` — Supplier spend
- `GET /api/reports/revenue` — Revenue summary

**Sub-tasks:**

- [ ] Write test: GST summary returns correct breakup
- [ ] Write test: supplier ledger returns per-supplier totals
- [ ] Write test: revenue summary with period grouping
- [ ] Create `FinanceReportService`
- [ ] Create route handlers
- [ ] Verify tests pass

### Story 13.4: Performance Reports

#### Task 13.4.1: Create performance report endpoints

**Endpoints:**

- `GET /api/reports/loom-utilization` — Per loom type
- `GET /api/reports/downtime` — By reason/loom/wager
- `GET /api/reports/shift-production` — Shift-wise (when enabled)

**Sub-tasks:**

- [ ] Write test: loom utilization per type
- [ ] Write test: downtime breakdown
- [ ] Write test: shift-wise production (only when shift_enabled)
- [ ] Create `PerformanceReportService`
- [ ] Create route handlers
- [ ] Verify tests pass

---

### Integration Test: Epic 13

- [ ] **IT-13.1**: Generate production data → run reports → verify accuracy
- [ ] **IT-13.2**: Report access control → owner and permitted staff only
- [ ] **IT-13.3**: Reports with batch filter → correct when batch_enabled

---

## Epic 14: Scheduled Jobs

### Story 14.1: Scheduled Tasks

> As a system, I need scheduled jobs for automated processes.

#### Task 14.1.1: Create scheduled job infrastructure

**Sub-tasks:**

- [ ] Write test: job scheduler executes at correct intervals
- [ ] Set up job scheduler (node-cron or bull queue)
- [ ] Create job definitions:
  - Wage cycle auto-generation (per tenant's wage_cycle_day)
  - Overdue invoice detection (daily)
  - Credit due approaching notification (daily)
  - Fraud detection scans (daily)
- [ ] Create job execution logging
- [ ] Verify tests pass

---

## Spec Validation Matrix (Backend vs V3 Spec)

| Spec Feature                   | Backend Coverage                       | Epic        | Status  |
| ------------------------------ | -------------------------------------- | ----------- | ------- |
| Phone OTP login                | AuthService.sendOTP, verifyOTP         | Epic 2      | Covered |
| Phone PIN login                | AuthService.verifyPIN                  | Epic 2      | Covered |
| 6 User Roles                   | authorize() middleware                 | Epic 1      | Covered |
| Staff Permissions              | requirePermission() middleware         | Epic 1, 3   | Covered |
| Tenant isolation               | tenantScope middleware + RLS           | Epic 1      | Covered |
| Loom type capacity             | LoomType CRUD + performance calc       | Epic 4, 7   | Covered |
| Product master (all fields)    | Product CRUD with all rates            | Epic 4      | Covered |
| Color pricing (2 modes)        | Invoice price lookup                   | Epic 4, 11  | Covered |
| 4 Wager types                  | Production return validation           | Epic 7      | Covered |
| Batch system (optional)        | Feature flag + conditional logic       | Epic 5      | Covered |
| Cone purchase                  | ConePurchaseService                    | Epic 6      | Covered |
| 6-stage inventory              | InventoryService stage management      | Epic 6      | Covered |
| Paavu production               | PaavuProductionService                 | Epic 7      | Covered |
| Wager production returns       | ProductionReturnService (weight/count) | Epic 7      | Covered |
| Wastage rules                  | Validation per wager type              | Epic 7      | Covered |
| Damage grading (3 grades)      | DamageService                          | Epic 8      | Covered |
| Damage approval workflow       | DamageApprovalService                  | Epic 8      | Covered |
| Damage traceability            | Production return → wager link         | Epic 8      | Covered |
| Miscellaneous damage           | is_miscellaneous flag                  | Epic 8      | Covered |
| Tailoring (stitch + knot)      | TailoringService                       | Epic 9      | Covered |
| Packaging (small + large)      | PackagingService                       | Epic 9      | Covered |
| Advance system                 | AdvanceService                         | Epic 10     | Covered |
| Wage calculation formula       | WageCycleService                       | Epic 10     | Covered |
| Negative balance handling      | Discretionary payment logic            | Epic 10     | Covered |
| Configurable wage cycle day    | Tenant settings + scheduler            | Epic 10, 14 | Covered |
| Shift tracking (optional)      | Feature flag + shift-aware production  | Epic 7      | Covered |
| Shift-wise wage rates          | ShiftWageRate lookup in wage calc      | Epic 7, 10  | Covered |
| Performance ranking            | PerformanceService                     | Epic 7      | Covered |
| Visibility control             | show_wager_ranking flag                | Epic 7      | Covered |
| GST auto-detection             | InvoiceService tax logic               | Epic 11     | Covered |
| Partial & bill-to-bill payment | PaymentService validation              | Epic 11     | Covered |
| Credit period per customer     | Due date calculation                   | Epic 11     | Covered |
| E-way bill export              | JSON export endpoint                   | Epic 11     | Covered |
| Inter-godown transfer          | TransferService                        | Epic 6      | Covered |
| 11 notification events         | NotificationTriggerService             | Epic 12     | Covered |
| 7 fraud alert types            | FraudDetectionService                  | Epic 12     | Covered |
| All reports                    | ReportService modules                  | Epic 13     | Covered |
| Scheduled jobs                 | Job scheduler                          | Epic 14     | Covered |

---

## API Endpoint Summary

| Module               | Endpoints | Method Distribution                |
| -------------------- | --------- | ---------------------------------- |
| Auth                 | 5         | POST: 4, GET: 1                    |
| Tenants              | 4         | POST: 1, GET: 2, PUT: 1            |
| Tenant Settings      | 2         | GET: 1, PUT: 1                     |
| Users                | 5         | POST: 1, GET: 2, PUT: 2            |
| Staff Permissions    | 2         | GET: 1, PUT: 1                     |
| Loom Types           | 3         | POST: 1, GET: 1, PUT: 1            |
| Looms                | 4         | POST: 1, GET: 1, PUT: 2            |
| Products             | 3         | POST: 1, GET: 1, PUT: 1            |
| Product Color Prices | 4         | POST: 1, GET: 1, PUT: 1, DELETE: 1 |
| Shift Wage Rates     | 3         | POST: 1, GET: 1, PUT: 1            |
| Suppliers            | 3         | POST: 1, GET: 1, PUT: 1            |
| Customers            | 3         | POST: 1, GET: 1, PUT: 1            |
| Godowns              | 3         | POST: 1, GET: 1, PUT: 1            |
| Wagers               | 4         | POST: 1, GET: 2, PUT: 1            |
| Batches              | 3         | POST: 1, GET: 1, PUT: 1            |
| Cone Purchases       | 2         | POST: 1, GET: 1                    |
| Inventory            | 3         | GET: 3                             |
| Transfers            | 2         | POST: 1, GET: 1                    |
| Cone Issuances       | 2         | POST: 1, GET: 1                    |
| Paavu Productions    | 2         | POST: 1, GET: 1                    |
| Production Returns   | 2         | POST: 1, GET: 1                    |
| Loom Downtimes       | 3         | POST: 1, GET: 1, PUT: 1            |
| Shifts               | 3         | POST: 1, GET: 1, PUT: 1            |
| Performance          | 2         | GET: 2                             |
| Damage Records       | 4         | POST: 1, GET: 2, PUT: 1            |
| Damage Approval      | 2         | PUT: 2                             |
| Tailoring Records    | 2         | POST: 1, GET: 1                    |
| Packaging Records    | 2         | POST: 1, GET: 1                    |
| Advances             | 3         | POST: 1, GET: 2                    |
| Wage Cycles          | 6         | POST: 1, GET: 2, PUT: 3            |
| Invoices             | 6         | POST: 1, GET: 2, PUT: 3            |
| E-way Bill           | 1         | GET: 1                             |
| Payments             | 3         | POST: 1, GET: 2                    |
| Notifications        | 4         | GET: 2, PUT: 2                     |
| Fraud Alerts         | 2         | GET: 1, PUT: 1                     |
| Reports              | 14        | GET: 14                            |
| Health               | 1         | GET: 1                             |
| **Total**            | **~112**  |                                    |

---

## Testing Strategy Summary

| Test Type                    | Estimated Count | Scope                                    |
| ---------------------------- | --------------- | ---------------------------------------- |
| Unit Tests (per sub-task)    | ~250+           | Individual endpoint, service, middleware |
| Integration Tests (per epic) | ~60+            | Cross-module workflows, full API flows   |
| Auth Tests                   | ~20+            | Token, role, permission checks           |
| Validation Tests             | ~50+            | Zod schema validation for all endpoints  |
| Business Logic Tests         | ~80+            | Wage calculation, GST, damage, inventory |

**TDD Cycle for each endpoint:**

1. RED: Write API test (HTTP call) → test fails (route not found)
2. GREEN: Create route + service + repository → test passes
3. REFACTOR: Extract reusable logic, optimize queries
