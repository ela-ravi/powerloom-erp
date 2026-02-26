# Agentic Implementation Guide — Powerloom ERP

> **One guide to build the entire backend.** Uses Claude Code's generators, skills, and agents to go from zero to a production-ready multi-tenant ERP API.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [How the Agentic System Works](#2-how-the-agentic-system-works)
3. [Tool Reference Card](#3-tool-reference-card)
4. [The Implementation Workflow](#4-the-implementation-workflow)
5. [Phase-by-Phase Walkthrough](#5-phase-by-phase-walkthrough)
6. [Teammate Workflow](#6-teammate-workflow)
7. [Quality Gates & Milestones](#7-quality-gates--milestones)
8. [Tips & Troubleshooting](#8-tips--troubleshooting)

---

## 1. Quick Start

### Prerequisites

- Node.js >= 18 LTS
- PostgreSQL 15+ (Supabase hosted or local)
- pnpm (preferred)
- Git
- Claude Code CLI installed and authenticated

### Initial Setup

```bash
# Clone and install
git clone <repo-url> && cd powerloom-erp
pnpm install

# Create databases
createdb powerloom_erp
createdb powerloom_erp_test
psql powerloom_erp -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
psql powerloom_erp_test -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'

# Copy and configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, TEST_DATABASE_URL, JWT_SECRET, etc.
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/powerloom_erp
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/powerloom_erp_test
JWT_SECRET=your-256-bit-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SMS_PROVIDER=mock
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

### Verify Tooling Works

```bash
# Test generators
pnpm gen:migration test_table     # Should create a migration file
rm src/db/migrations/*test_table*  # Clean up

# Test skills (inside Claude Code)
/spec wager types                  # Should return wager type definitions
```

### Read the Spec First

Before building anything, skim these two files:

- **`docs/powerloom-erp-v3.md`** — The full product specification (source of truth)
- **`CLAUDE.md`** — Tech stack, domain terminology, conventions

---

## 2. How the Agentic System Works

The implementation tooling has three layers, each serving a different purpose:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: AGENTS (automated validation)                     │
│  Trigger automatically or on-demand to review your work     │
│  db-reviewer, business-logic-validator, test-runner, etc.   │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: SKILLS (LLM-powered customization)                │
│  Claude reads the spec and fills in the TODOs               │
│  /db-migration, /scaffold-module, /generate-test, etc.      │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: GENERATORS (deterministic boilerplate)            │
│  pnpm gen:* scripts output consistent file structures       │
│  gen:migration, gen:module, gen:test, gen:seed, etc.        │
└─────────────────────────────────────────────────────────────┘
```

### Layer 1: Generators (`pnpm gen:*`)

Deterministic TypeScript scripts that produce consistent boilerplate with `TODO` placeholders. They enforce project conventions (naming, directory structure, tenant isolation patterns) without needing AI.

**When to use:** Always run generators first. They give you the skeleton.

### Layer 2: Skills (`/skill-name`)

Claude Code skills that invoke generators and then fill in the TODOs using knowledge of the ERP spec, the database plan, and domain terminology. A skill call = generator + AI customization.

**When to use:** Instead of running generators manually. Skills produce ready-to-review code.

### Layer 3: Agents

Specialized Claude agents that validate your work against the spec, checklists, and domain rules. Some trigger automatically (proactive), others you invoke manually.

**When to use:** After writing code (proactive agents run on their own) and at phase boundaries (invoke manual agents explicitly).

### How They Work Together

```
You invoke a skill:  /db-migration cone_purchases
    ↓
Skill runs generator:  pnpm gen:migration cone_purchases
    ↓
Generator creates:     src/db/migrations/20260216_create_cone_purchases.sql
    (with TODO placeholders for columns, FKs, indexes)
    ↓
Skill fills TODOs:     Claude reads spec, adds correct columns, FK constraints,
                       indexes, RLS policy, enum types
    ↓
Agent auto-triggers:   db-reviewer validates schema, RLS, naming, FK integrity
    ↓
You review and commit
```

---

## 3. Tool Reference Card

### Generators (6)

| Generator   | Command                                        | Output                                                 | When to Use                     |
| ----------- | ---------------------------------------------- | ------------------------------------------------------ | ------------------------------- |
| Migration   | `pnpm gen:migration <table>`                   | `src/db/migrations/<timestamp>_create_<table>.sql`     | New database table              |
| Module      | `pnpm gen:module <name>`                       | 7 files: routes, schema, types, service, repo, 2 tests | New API module                  |
| Test        | `pnpm gen:test <name> [--unit\|--integration]` | Test files in `__tests__/`                             | TDD RED phase                   |
| Endpoint    | `pnpm gen:endpoint <METHOD> <path> <module>`   | Snippet file in `_generated/`                          | Add endpoint to existing module |
| Seed        | `pnpm gen:seed <table\|all>`                   | `src/db/seeds/<table>.seed.ts`                         | Test data for a table           |
| Translation | `pnpm gen:translation <module>`                | `src/i18n/_generated/<module>.i18n.json`               | i18n keys (EN + Tamil)          |

### Skills (8)

| #   | Skill           | Command                                       | What It Does                                               |
| --- | --------------- | --------------------------------------------- | ---------------------------------------------------------- |
| S1  | DB Migration    | `/db-migration <table>`                       | Runs `gen:migration` + fills columns, FKs, RLS from spec   |
| S2  | Scaffold Module | `/scaffold-module <module>`                   | Runs `gen:module` + fills Zod schema, service logic, types |
| S3  | Generate Test   | `/generate-test <module> [unit\|integration]` | Runs `gen:test` + writes domain-specific test cases        |
| S4  | API Endpoint    | `/api-endpoint <METHOD> </path> <module>`     | Runs `gen:endpoint` + fills route, schema, service, test   |
| S5  | Generate Seed   | `/generate-seed <table>`                      | Runs `gen:seed` + fills realistic powerloom industry data  |
| S6  | Add Translation | `/add-translation <key> <en> <ta>`            | Adds i18n key with English + Tamil text                    |
| S7  | Spec            | `/spec <topic>`                               | Quick-reference the V3 spec (read-only, no files created)  |
| S8  | Review PR       | `/review-pr <pr_number>`                      | Domain-specific PR review with tenant + business checks    |

### Agents (7)

| #   | Agent                      | Trigger                   | Model  | What It Validates                                              |
| --- | -------------------------- | ------------------------- | ------ | -------------------------------------------------------------- |
| A1  | `db-reviewer`              | Proactive (on migrations) | Sonnet | Schema, RLS, indexes, FK integrity, naming                     |
| A2  | `domain-expert`            | Manual                    | Sonnet | Business rules, wager types, wage formulas, textile terms      |
| A3  | `business-logic-validator` | Proactive (on services)   | Sonnet | Service logic vs V3 spec (8 critical rule categories)          |
| A4  | `ux-auditor`               | Proactive (on UI)         | Sonnet | 48px targets, large fonts, i18n, one-tap actions               |
| A5  | `test-runner`              | Proactive (after code)    | Haiku  | Runs tests, reports pass/fail, suggests fixes                  |
| A6  | `checklist-validator`      | Manual                    | Sonnet | CL-DB (148 items) + CL-BE (149 items) coverage                 |
| A7  | `devils-advocate`          | Manual (milestones)       | Sonnet | Stress-tests designs, finds edge cases, challenges assumptions |

---

## 4. The Implementation Workflow

Every module follows the same repeatable cycle:

```
┌──────────────────────────────────────────────────────────┐
│  A. UNDERSTAND  →  Read spec, ask domain-expert          │
│  B. GENERATE    →  Run generators / skills               │
│  C. CUSTOMIZE   →  Fill TODOs, add business logic        │
│  D. VALIDATE    →  Agents review (auto + manual)         │
│  E. TEST        →  TDD cycle (RED → GREEN → REFACTOR)    │
│  F. TRACK       →  checklist-validator confirms coverage  │
└──────────────────────────────────────────────────────────┘
```

### Step A: Understand

```bash
# Read the spec section for the current module
/spec <topic>

# Ask the domain expert for clarification
# (The domain-expert agent is invoked automatically when you ask
#  business logic questions about wager types, wages, etc.)
```

Example: Before building the production module, ask:

> "What are the return validation rules for wager Type 1 vs Type 2?"

### Step B: Generate

```bash
# Database first
/db-migration <table_name>

# Then scaffold the module
/scaffold-module <module_name>

# Add seed data
/generate-seed <table_name>
```

### Step C: Customize

The skills fill most TODOs, but you'll need to:

- Add module-specific business logic in the service layer
- Add custom repository queries beyond basic CRUD
- Wire up feature flag checks (batch_enabled, shift_enabled, etc.)
- Add cross-module dependencies (e.g., production returns updating inventory)

### Step D: Validate

Agents run automatically:

- **`db-reviewer`** — Triggers when you create/modify migration files
- **`business-logic-validator`** — Triggers when you create/modify service files
- **`test-runner`** — Triggers after code changes

Invoke manually when needed:

```bash
# Ask the domain expert about business rules
# (use naturally in conversation — the agent triggers on domain questions)

# Run checklist validator to check coverage
# (invoke the checklist-validator agent manually)
```

### Step E: Test (TDD Cycle)

```bash
# 1. RED — Write failing tests first
/generate-test <module> unit

# Run — must FAIL (no implementation yet)
pnpm test -- --run src/modules/<module>/__tests__/*.test.ts

# 2. GREEN — Implement minimum code to pass
/scaffold-module <module>
# or
/api-endpoint <METHOD> </path> <module>

# Run — must PASS
pnpm test -- --run

# 3. REFACTOR — Clean up
# Extract shared logic, optimize queries, add i18n keys
/add-translation <key> <en> <ta>
```

### Step F: Track

After completing a phase:

- Invoke the `checklist-validator` agent to scan CL-DB + CL-BE coverage
- Update the progress dashboard (see [Quality Gates](#7-quality-gates--milestones))
- At milestone phases (1, 5, 8, 9): invoke `devils-advocate`

---

## 5. Phase-by-Phase Walkthrough

### Phase Dependency Graph

```
Phase 0 (Setup)
  └→ Phase 1 (Foundation)
       ├→ Phase 2 (Master Data)
       │    ├→ Phase 4 (Inventory) ←── Phase 3 (Batch)
       │    │    └→ Phase 5 (Production)
       │    │         ├→ Phase 6 (Damage)
       │    │         ├→ Phase 7 (Post-Production)
       │    │         │    └→ Phase 8 (Wage & Advance) ←── Phase 6, 7
       │    │         └→ Phase 11 (Reports) ←── Phases 5-9
       │    └→ Phase 9 (Sales & Finance) ←── Phase 4
       │         └→ Phase 10 (Notifications) ←── Phase 8, 9
       │              └→ Phase 12 (Scheduled Jobs) ←── Phase 8, 9, 10
       └→ Phase 3 (Batch)
  Phase 13 (Indexes) — after Phases 1-9
  Phase 14 (Swagger) — after Phases 0-12
```

---

### Phase 0: Project Setup & Middleware (Detailed Tutorial)

> **Dependencies:** None | **Tables:** 0 | **Endpoints:** 1 (`GET /api/health`) | **Tests:** ~25 unit

Phase 0 is the foundation for everything. It delivers the Express app, all middleware, base repository pattern, transaction wrapper, audit service, and health check. No database tables — just infrastructure.

#### Step A: Understand

```bash
/spec middleware
/spec error handling
/spec authentication flow
```

Key concepts:

- JWT authentication with tenantId, userId, role claims
- RLS tenant isolation via `SET app.tenant_id` on every DB connection
- Role hierarchy: `super_admin > owner > staff > wager/tailor/packager`
- Structured error responses: `{ error: { code, message, details[] } }`

#### Step B: Generate (RED Phase — Write Failing Tests First)

```bash
# Write tests for all middleware components
/generate-test health unit
/generate-test error-handler unit
/generate-test validate unit
/generate-test authenticate unit
/generate-test tenant-scope unit
/generate-test authorize unit
/generate-test request-logger unit
/generate-test base-repository unit
/generate-test transaction unit
/generate-test audit-service unit
```

Run all tests — they **MUST** fail:

```bash
pnpm test -- --run src/middleware/__tests__/*.unit.test.ts
pnpm test -- --run src/shared/__tests__/*.unit.test.ts
pnpm test -- --run src/modules/health/__tests__/*.unit.test.ts
```

#### Step C: Generate (GREEN Phase — Implement)

```bash
# Scaffold the auth module (creates Express app, config, middleware)
/scaffold-module auth

# Health check endpoint
/api-endpoint GET /api/health health

# Base infrastructure (service, repository, transaction, audit)
/scaffold-module shared
```

**What gets created:**

```
src/
├── app.ts                       # Express setup + middleware chain
├── server.ts                    # Entry point, graceful shutdown
├── config/
│   ├── env.ts                   # Zod-validated environment variables
│   ├── database.ts              # PostgreSQL connection pool
│   └── logger.ts                # Pino structured logger
├── middleware/
│   ├── errorHandler.ts          # Global error handler + AppError
│   ├── validate.ts              # Zod validation middleware factory
│   ├── authenticate.ts          # JWT verification
│   ├── tenantScope.ts           # RLS tenant context
│   ├── authorize.ts             # Role + permission checks
│   └── requestLogger.ts         # Structured request logging
├── shared/
│   ├── base.repository.ts       # BaseRepository<T> with tenant-scoped CRUD
│   ├── transaction.ts           # withTransaction() wrapper
│   ├── audit.service.ts         # AuditService.log()
│   └── errors.ts                # AppError class, error codes
└── types/
    ├── enums.ts                 # UserRole, TenantStatus, Permission
    ├── models.ts                # Base model interfaces
    └── api.ts                   # Request/response types, pagination
```

Run all tests — they **MUST** pass:

```bash
pnpm test -- --run
```

#### Step D: Refactor

```bash
# Extract common Zod schemas
# (uuid, phone, pagination) → src/shared/schemas.ts

# Add i18n keys for error messages
/add-translation error.unauthorized "Unauthorized access" "அங்கீகரிக்கப்படாத அணுகல்"
/add-translation error.forbidden "Access denied" "அணுகல் மறுக்கப்பட்டது"
/add-translation error.validation "Validation failed" "சரிபார்ப்பு தோல்வி"
/add-translation error.not_found "Resource not found" "வளம் கிடைக்கவில்லை"
/add-translation error.internal "Internal server error" "உள் சேவையக பிழை"

# Verify TypeScript compiles cleanly
pnpm tsc --noEmit
pnpm lint
```

#### Step E: Integration Tests

```bash
/generate-test middleware integration
```

| Test ID | Description                                | Validates                     |
| ------- | ------------------------------------------ | ----------------------------- |
| IT-1.1  | Server starts, health returns 200          | Express boots, routing works  |
| IT-1.2  | Unauthenticated → 401, authenticated → 200 | Auth middleware chain         |
| IT-1.3  | Tenant A user cannot access Tenant B data  | Tenant isolation via RLS      |
| IT-1.4  | Staff without permission gets 403          | Permission middleware         |
| IT-1.5  | Errors formatted correctly                 | Error response consistency    |
| IT-1.6  | Transaction rolls back on failure          | Transaction wrapper atomicity |

#### Step F: Manual Testing

```bash
# Health check
curl -s http://localhost:3000/api/health | jq
# → { "status": "ok", "timestamp": "..." }

# Unauthenticated request
curl -s -w "\n%{http_code}" http://localhost:3000/api/tenants
# → 401

# Invalid token
curl -s -H "Authorization: Bearer invalid" http://localhost:3000/api/tenants
# → 401
```

#### Verification Gate

- [ ] All unit tests pass (`pnpm test -- --run`)
- [ ] All 6 integration tests pass (IT-1.1 through IT-1.6)
- [ ] `GET /api/health` returns 200 via curl
- [ ] Unauthenticated requests return 401
- [ ] `business-logic-validator` approved middleware logic
- [ ] `checklist-validator` confirmed CL-BE-01 items 1.1–1.10 (10/10)
- [ ] i18n keys added for all error messages
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint warnings (`pnpm lint`)

> **Deep dive:** [06a-foundation-phases.md — Phase 0](./plans/06a-foundation-phases.md#phase-0-project-setup--middleware)

---

### Phase 1: Foundation — Tenants, Users, Auth

> **Dependencies:** Phase 0 | **Tables:** 6 | **Endpoints:** 20 | **Tests:** ~75 unit, ~10 integration
>
> **MILESTONE** — `devils-advocate` review required after completion

#### What It Builds

| Tables              | Purpose                                                               |
| ------------------- | --------------------------------------------------------------------- |
| `tenants`           | Business entities with GST state code                                 |
| `tenant_settings`   | Feature flags (batch, shift, auth methods), wage config, damage rates |
| `users`             | All user accounts with role enum                                      |
| `staff_permissions` | Granular permission assignments                                       |
| `otp_codes`         | Phone OTP storage (hashed, expiring)                                  |
| `audit_logs`        | All entity changes (create/update/delete)                             |

**Endpoints:** 6 auth + 5 tenant + 2 tenant settings + 5 user + 2 staff permissions = 20

#### Commands to Run

```bash
# RED — Write failing tests
/generate-test tenants unit
/generate-test auth unit
/generate-test users unit

# GREEN — Create tables (order matters: FK dependencies)
/db-migration tenants
/db-migration tenant_settings
/db-migration users
/db-migration staff_permissions
/db-migration otp_codes
/db-migration audit_logs

# GREEN — Run migrations
pnpm db:migrate

# GREEN — Implement modules
/scaffold-module tenants
/scaffold-module auth
/scaffold-module users

# GREEN — Seed data
/generate-seed tenants
/generate-seed users

# Integration tests
/generate-test phase-1 integration

# i18n
/add-translation auth.otp.sent "OTP sent successfully" "OTP வெற்றிகரமாக அனுப்பப்பட்டது"
/add-translation auth.otp.invalid "Invalid OTP" "தவறான OTP"
/add-translation auth.otp.expired "OTP has expired" "OTP காலாவதியானது"
/add-translation auth.pin.invalid "Invalid PIN" "தவறான PIN"
/add-translation tenant.created "Tenant created successfully" "நிறுவனம் வெற்றிகரமாக உருவாக்கப்பட்டது"
/add-translation user.created "User created successfully" "பயனர் வெற்றிகரமாக உருவாக்கப்பட்டார்"
```

#### Key Business Logic

- OTP flow: send → verify → JWT with `{ tenantId, userId, role }`
- PIN fallback: phone + 4-digit PIN for unreliable SMS areas
- Auth method per tenant: `auth_otp_enabled` / `auth_pin_enabled` flags
- Creating a user with `role='wager'` auto-creates `wager_profile`
- RLS on all 6 tables; wager can only see own user record
- Rate limiting: max 5 OTPs per phone per hour

#### Agents That Activate

- **Proactive:** `db-reviewer` (on 6 migrations), `business-logic-validator` (on auth/tenant services), `test-runner`
- **Manual:** `domain-expert` (role hierarchy), `checklist-validator` (CL-DB-01/02, CL-BE-02/03)
- **MILESTONE:** `devils-advocate` — stress-tests tenant isolation, auth bypass, permission escalation

#### Verification Gate

- [ ] ~75 unit + 10 integration tests pass
- [ ] All 6 DB tables with RLS policies active
- [ ] All 20 endpoints responding via curl ([06e reference](./plans/06e-curl-reference.md#phase-1-foundation--tenants-users-auth))
- [ ] `checklist-validator`: CL-DB-01 (11/11), CL-DB-02 (10/10), CL-BE-02 (10/10), CL-BE-03 (8/8)
- [ ] **`devils-advocate` review completed**
- [ ] Seed data: 2 tenants with all role types

> **Deep dive:** [06a-foundation-phases.md — Phase 1](./plans/06a-foundation-phases.md#phase-1-foundation--tenants-users-auth)

---

### Phase 2: Master Data

> **Dependencies:** Phase 1 | **Tables:** 9 | **Endpoints:** 30 | **Tests:** ~90 unit, ~5 integration

#### What It Builds

| Tables                 | Purpose                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| `loom_types`           | Loom categories with capacity ratings                               |
| `looms`                | Individual looms with wager assignment                              |
| `products`             | Product definitions (24+ columns: consumption, wages, bundles, GST) |
| `product_color_prices` | Per-color pricing (Mode 2)                                          |
| `shift_wage_rates`     | Shift-specific wage overrides                                       |
| `suppliers`            | Cotton cone suppliers                                               |
| `customers`            | Wholesale/retail with credit terms and state code                   |
| `godowns`              | Warehouses + Paavu Pattarai                                         |
| `wager_profiles`       | Worker type (1-4), advance balance                                  |

#### Commands to Run

```bash
# RED — Tests for all 7 module groups
/generate-test loom-types unit
/generate-test looms unit
/generate-test products unit
/generate-test suppliers unit
/generate-test customers unit
/generate-test godowns unit
/generate-test wagers unit

# GREEN — 9 migrations (FK order)
/db-migration loom_types
/db-migration looms
/db-migration products
/db-migration product_color_prices
/db-migration shift_wage_rates
/db-migration suppliers
/db-migration customers
/db-migration godowns
/db-migration wager_profiles
pnpm db:migrate

# GREEN — 7 module scaffolds
/scaffold-module loom-types
/scaffold-module looms
/scaffold-module products
/scaffold-module suppliers
/scaffold-module customers
/scaffold-module godowns
/scaffold-module wagers

# GREEN — Seed data
/generate-seed loom_types
/generate-seed products
/generate-seed suppliers
/generate-seed customers
/generate-seed godowns
/generate-seed wager_profiles

# Integration tests
/generate-test phase-2 integration
```

#### Key Business Logic

- Product has 24+ columns — group Zod schema into sections (basic, consumption, wages, bundles, GST)
- `color_pricing_mode`: `average` (single price) vs `per_color` (via `product_color_prices`)
- Shift wage rates only accessible when `shift_enabled=true`
- Godown: only one `is_main=true` per tenant
- Loom assignment: validate assigned user has `role='wager'`
- Wager type CHECK constraint (1-4)

#### Verification Gate

- [ ] ~90 unit + 5 integration tests pass
- [ ] All 9 tables with RLS; 30 endpoints responding
- [ ] `checklist-validator`: CL-DB-03 through CL-DB-07 (32 items), CL-BE-04 (14 items)
- [ ] Seed data with realistic powerloom industry values

> **Deep dive:** [06a-foundation-phases.md — Phase 2](./plans/06a-foundation-phases.md#phase-2-master-data)

---

### Phase 3: Batch System

> **Dependencies:** Phase 1 | **Tables:** 1 | **Endpoints:** 3 | **Tests:** ~15 unit, 2 integration

#### What It Builds

- `batches` table with tenant-scoped auto-generated `batch_number`
- Feature flag: all batch endpoints return 403 when `batch_enabled=false`
- Status lifecycle: `open → in_progress → closed` (closed can reopen)

#### Commands to Run

```bash
/generate-test batches unit
/db-migration batches
/scaffold-module batches
/generate-test batches integration
/generate-seed batches
/add-translation batch.created "Batch created" "தொகுதி உருவாக்கப்பட்டது"
```

#### Verification Gate

- [ ] Feature flag enforcement tested (403 when disabled)
- [ ] Status transitions validated (no skipping states)
- [ ] `checklist-validator`: CL-DB-08 (4 items), CL-BE-05 (5 items)

> **Deep dive:** [06b-core-phases.md — Phase 3](./plans/06b-core-phases.md#phase-3-batch-system)

---

### Phase 4: Inventory & Raw Materials

> **Dependencies:** Phase 2, 3 | **Tables:** 4 | **Endpoints:** 7 | **Tests:** ~30 unit, 3 integration

#### What It Builds

| Tables                   | Purpose                                                                         |
| ------------------------ | ------------------------------------------------------------------------------- |
| `inventory`              | Stock tracked by 5-dimensional key: godown + product + color + stage + batch_id |
| `inventory_movements`    | Audit trail for all stock changes                                               |
| `cone_purchases`         | Raw material purchases from suppliers (kg, cost, GST)                           |
| `inter_godown_transfers` | Atomic stock moves between godowns                                              |

#### Commands to Run

```bash
# RED
/generate-test cone-purchases unit
/generate-test inventory unit
/generate-test transfers unit

# GREEN — Migrations
/db-migration inventory
/db-migration inventory_movements
/db-migration cone_purchases
/db-migration inter_godown_transfers
pnpm db:migrate

# GREEN — Modules
/scaffold-module cone-purchases
/scaffold-module inventory
/scaffold-module transfers

# GREEN — Seeds + integration tests
/generate-seed cone_purchases
/generate-test phase-4 integration
```

#### Key Business Logic

- **6-stage pipeline:** `raw_cone → paavu → woven → tailored → bundled → sold`
- **5-dimensional inventory key:** `(godown_id, product_id, color, stage, batch_id)` with COALESCE for null batch
- Cone purchases auto-calculate `total_cost` and `gst_amount`
- Inter-godown transfers are atomic (decrease source + increase destination in one transaction)
- All stock changes logged in `inventory_movements`

#### Verification Gate

- [ ] Cone purchase → inventory auto-update verified
- [ ] Atomic transfers tested (rollback on failure)
- [ ] `checklist-validator`: CL-DB-09/10/11, CL-BE-06

> **Deep dive:** [06b-core-phases.md — Phase 4](./plans/06b-core-phases.md#phase-4-inventory--raw-materials)

---

### Phase 5: Production System

> **Dependencies:** Phase 4 | **Tables:** 5 | **Endpoints:** 14 | **Tests:** ~50 unit, 7 integration
>
> **MILESTONE** — `devils-advocate` review required

#### What It Builds

| Tables               | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `cone_issuances`     | Raw cone issued to wagers (kg, color, godown)      |
| `paavu_productions`  | Warp thread preparation records                    |
| `production_returns` | Wager returns (woven pieces) with weight/count     |
| `loom_downtimes`     | Downtime tracking by reason, loom, wager           |
| `shifts`             | Shift-wise production records (when shift_enabled) |

#### Commands to Run

```bash
# RED
/generate-test cone-issuances unit
/generate-test paavu-productions unit
/generate-test production-returns unit
/generate-test loom-downtimes unit
/generate-test shifts unit

# GREEN — Migrations
/db-migration cone_issuances
/db-migration paavu_productions
/db-migration production_returns
/db-migration loom_downtimes
/db-migration shifts
pnpm db:migrate

# GREEN — Modules
/scaffold-module cone-issuances
/scaffold-module paavu-productions
/scaffold-module production-returns
/scaffold-module loom-downtimes
/scaffold-module shifts

# GREEN — Performance endpoints
/api-endpoint GET /api/wagers/:id/performance production-returns
/api-endpoint GET /api/wagers/ranking production-returns

# Integration tests
/generate-test phase-5 integration
```

#### Key Business Logic

- **Wager Types 1/3** (Paavu + Oodai): `weight_kg` mandatory, `piece_count` optional
- **Wager Types 2/4** (Oodai only): `piece_count` mandatory, `weight_kg` optional
- Cone issuance checks raw_cone stock — throws if insufficient
- Production returns increase `woven` stage inventory atomically
- Wastage auto-flagged when `wastage_kg > tenant_settings.paavu_wastage_limit_grams`
- Color substitution fraud: return color != issued color → fraud alert
- Performance: `utilization% = actual / (capacity * working_days) * 100`

#### Verification Gate

- [ ] ~50 unit + 7 integration tests pass
- [ ] Wager type return validation enforced
- [ ] Inventory transitions atomic
- [ ] **`devils-advocate` review completed** (production accuracy, fraud detection)
- [ ] `checklist-validator`: CL-DB-12, CL-BE-07

> **Deep dive:** [06b-core-phases.md — Phase 5](./plans/06b-core-phases.md#phase-5-production-system)

---

### Phase 6: Damage Management

> **Dependencies:** Phase 5 | **Tables:** 1 | **Endpoints:** 3+ | **Tests:** ~20 unit

#### What It Builds

- `damage_records` table with grade (Minor/Major/Reject), approval workflow, wager traceability

#### Commands to Run

```bash
/generate-test damages unit
/db-migration damage_records
/scaffold-module damages
/generate-test damages integration
```

#### Key Business Logic

- **Deduction formula:** `damage_count × production_cost_per_piece × grade_deduction_rate`
- Owner approval required before any deduction applies
- Damage traceable to original wager indefinitely
- Unidentifiable damage → "Miscellaneous" (owner absorbs cost)
- Grade deduction rates configurable per tenant in `tenant_settings`

#### Verification Gate

- [ ] Approval workflow tested (no deduction without approval)
- [ ] Deduction formula matches spec
- [ ] `checklist-validator`: CL-DB-14, CL-BE-08

> **Deep dive:** [06b-core-phases.md — Phase 6](./plans/06b-core-phases.md#phase-6-damage-management)

---

### Phase 7: Post-Production

> **Dependencies:** Phase 5 | **Tables:** 2 | **Endpoints:** 6+ | **Tests:** ~20 unit

#### What It Builds

| Tables              | Purpose                         |
| ------------------- | ------------------------------- |
| `tailoring_records` | Stitch + knot counts per tailor |
| `packaging_records` | Bundle counts per packager      |

#### Commands to Run

```bash
/generate-test tailoring unit
/generate-test packaging unit
/db-migration tailoring_records
/db-migration packaging_records
/scaffold-module tailoring
/scaffold-module packaging
/generate-test phase-7 integration
```

#### Key Business Logic

- **Tailor wage:** `(stitch_count × stitch_rate) + (knot_count × knot_rate)`
- **Packager wage:** `bundle_count × rate_per_bundle`
- Inventory transitions: `woven → tailored → bundled` (one-tap actions)
- Tailors/packagers have self-service read access to own records

#### Verification Gate

- [ ] Wage auto-calculation verified
- [ ] Inventory stage transitions atomic
- [ ] `checklist-validator`: CL-BE-09

> **Deep dive:** [06b-core-phases.md — Phase 7](./plans/06b-core-phases.md#phase-7-post-production)

---

### Phase 8: Wage & Advance

> **Dependencies:** Phase 5, 6, 7 | **Tables:** 3 | **Endpoints:** 10 | **Tests:** ~40 unit, 7 integration
>
> **MILESTONE** — `devils-advocate` review required

#### What It Builds

| Tables                 | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `advance_transactions` | Advance given/deducted/discretionary with running balance |
| `wage_cycles`          | Weekly wage periods (draft → review → approved → paid)    |
| `wage_records`         | Per-worker wage breakdown for each cycle                  |

#### Commands to Run

```bash
# RED
/generate-test advances unit
/generate-test wage-cycles unit

# GREEN — Migrations
/db-migration advance_transactions
/db-migration wage_cycles
/db-migration wage_records
pnpm db:migrate

# GREEN — Modules
/scaffold-module advances
/scaffold-module wage-cycles

# GREEN — Self-service endpoint
/api-endpoint GET /api/wagers/me/wages wage-cycles

# Integration + i18n
/generate-test wage-cycles integration
/add-translation wages.gross "Gross Wage" "மொத்த ஊதியம்"
/add-translation wages.net "Net Payable" "நிகர செலுத்த வேண்டியது"
/add-translation wages.advance_deduction "Advance Deduction" "முன்பணம் கழிப்பு"
```

#### Key Business Logic

```
Gross Wage (production-based per worker type)
- Advance Deduction (configurable amount per cycle)
- Damage Deduction (sum of approved damages for the week)
= Net Payable
```

- **Wager gross (Type 1/3):** `sum(return_weight_kg × product.wage_rate_per_kg)`
- **Wager gross (Type 2/4):** `sum(return_count × product.wage_rate_per_piece)`
- **Tailor gross:** `sum(tailoring_records.total_wage)`
- **Packager gross:** `sum(packaging_records.total_wage)`
- **Paavu Oati gross:** `sum(paavu_count × rate)`
- If `net_payable <= 0`, owner CAN pay discretionary amount → added to advance balance
- Wage cycle day configurable per tenant (`tenant_settings.wage_cycle_day`)
- Shift rates override default when `shift_enabled=true`

#### Verification Gate

- [ ] Wage formula matches spec exactly for all 4 worker types
- [ ] Negative net payable + discretionary payment tested
- [ ] Advance balance running total verified
- [ ] **`devils-advocate` review completed**
- [ ] `checklist-validator`: CL-DB-13, CL-BE-10

> **Deep dive:** [06c-financial-phases.md — Phase 8](./plans/06c-financial-phases.md#phase-8-wage--advance)

---

### Phase 9: Sales & Finance

> **Dependencies:** Phase 2, 4 | **Tables:** 3 | **Endpoints:** 10 | **Tests:** ~35 unit, 6 integration
>
> **MILESTONE** — `devils-advocate` review required

#### What It Builds

| Tables          | Purpose                                   |
| --------------- | ----------------------------------------- |
| `invoices`      | Sales invoices with GST, due date, status |
| `invoice_items` | Line items with quantity, rate, tax       |
| `payments`      | Payment recordings against invoices       |

#### Commands to Run

```bash
# RED
/generate-test invoices unit
/generate-test payments unit

# GREEN — Migrations
/db-migration invoices
/db-migration invoice_items
/db-migration payments
pnpm db:migrate

# GREEN — Modules
/scaffold-module invoices
/scaffold-module payments

# GREEN — Special endpoints
/api-endpoint GET /api/invoices/:id/eway-bill invoices
/api-endpoint GET /api/reports/customer-aging invoices

# Integration + i18n
/generate-test phase-9 integration
/add-translation invoice.subtotal "Subtotal" "உட்கூட்டு"
/add-translation invoice.cgst "CGST" "CGST"
/add-translation invoice.sgst "SGST" "SGST"
/add-translation invoice.igst "IGST" "IGST"
```

#### Key Business Logic

- **GST auto-detection:**
  - Same state → intra-state: `CGST = SGST = subtotal × (gst_rate / 2 / 100)`
  - Different state → inter-state: `IGST = subtotal × (gst_rate / 100)`
- **Payment enforcement by customer type:**
  - `wholesale_partial`: any amount allowed (partial payment OK)
  - `wholesale_bill_to_bill`: full invoice amount only (partial → 400)
- Invoice status: `draft → issued → partially_paid → paid`
- On invoice issuance, inventory moves to `sold` stage
- Customer `outstanding_balance` updated on issue/cancel/payment
- E-way bill JSON export with HSN codes

#### Verification Gate

- [ ] GST calculation matches spec (intra vs inter)
- [ ] Payment enforcement by customer type tested
- [ ] Inventory → sold transition on invoice issuance
- [ ] **`devils-advocate` review completed**
- [ ] `checklist-validator`: CL-DB-15 (partial), CL-BE-11

> **Deep dive:** [06c-financial-phases.md — Phase 9](./plans/06c-financial-phases.md#phase-9-sales--finance)

---

### Phase 10: Notifications & Alerts

> **Dependencies:** Phase 8, 9 | **Tables:** 2 | **Endpoints:** 6

#### What It Builds

- `notifications` — 11 event types with priority levels, read/unread, FCM push
- `fraud_alerts` — 7 fraud detection types with severity and resolution workflow

#### Commands to Run

```bash
/generate-test notifications unit
/generate-test fraud-alerts unit
/db-migration notifications
/db-migration fraud_alerts
/scaffold-module notifications
/scaffold-module fraud-alerts
/generate-test notifications integration
/add-translation notification.unread "Unread" "படிக்கவில்லை"
```

#### Key Details

- **11 notification events:** Credit due, overdue, wage cycle ready, wage paid, damage reported, fraud detected, production return, advance low, downtime, inventory mismatch, batch status change
- **7 fraud types:** Color substitution, excess wastage, underproduction, high damage %, loom inefficiency, inventory mismatch, customer overdue
- RLS: users see only own notifications; fraud alerts hidden from workers

> **Deep dive:** [06d-platform-phases.md — Phase 10](./plans/06d-platform-phases.md#phase-10-notifications--alerts)

---

### Phase 11: Reports

> **Dependencies:** Phases 5–9 | **Tables:** 0 | **Endpoints:** 14 (all read-only)

#### What It Builds

14 report endpoints querying existing tables across 4 categories:

| Category       | Reports                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Production (4) | Summary, batch profitability, color profitability, product profitability |
| Wager (4)      | Wage sheet, damage %, utilization %, advance balance                     |
| Inventory (3)  | Cone stock, finished stock by stage, movement history                    |
| Finance (3)    | GST summary, supplier ledger, revenue                                    |

#### Commands to Run

```bash
/generate-test reports unit
/scaffold-module reports

# 14 individual report endpoints
/api-endpoint GET /api/reports/production-summary reports
/api-endpoint GET /api/reports/batch-profitability reports
/api-endpoint GET /api/reports/color-profitability reports
/api-endpoint GET /api/reports/product-profitability reports
/api-endpoint GET /api/reports/wage-sheet reports
/api-endpoint GET /api/reports/wager-damage reports
/api-endpoint GET /api/reports/wager-utilization reports
/api-endpoint GET /api/reports/wager-advance-balance reports
/api-endpoint GET /api/reports/cone-stock reports
/api-endpoint GET /api/reports/finished-stock reports
/api-endpoint GET /api/reports/stock-movement reports
/api-endpoint GET /api/reports/gst-summary reports
/api-endpoint GET /api/reports/supplier-ledger reports
/api-endpoint GET /api/reports/revenue reports

/generate-test reports integration
```

#### Key Details

- All reports tenant-scoped with date range filtering
- Feature flag conditions apply (batch, shift reports hidden when disabled)
- Access: Owner + Staff with `reports` permission

> **Deep dive:** [06d-platform-phases.md — Phase 11](./plans/06d-platform-phases.md#phase-11-reports)

---

### Phase 12: Scheduled Jobs

> **Dependencies:** Phase 8, 9, 10 | **Tables:** 0 | **Endpoints:** 0

#### What It Builds

4 recurring background jobs using `node-cron`:

| Job                        | Schedule                      | Purpose                                  |
| -------------------------- | ----------------------------- | ---------------------------------------- |
| Wage cycle auto-generation | Per tenant's `wage_cycle_day` | Creates draft wage cycle                 |
| Overdue invoice detection  | Daily 00:00                   | Marks invoices past due date             |
| Credit due approaching     | Daily 08:00                   | Sends notification for due within 3 days |
| Fraud detection scan       | Daily 02:00                   | Runs all 7 fraud checks                  |

#### Commands to Run

```bash
pnpm add node-cron
pnpm add @types/node-cron -D
# Implement job scheduler in src/jobs/
```

#### Key Details

- Jobs iterate over all active tenants
- Idempotent (safe to re-run)
- Error isolation (one tenant failure doesn't affect others)

> **Deep dive:** [06d-platform-phases.md — Phase 12](./plans/06d-platform-phases.md#phase-12-scheduled-jobs)

---

### Phase 13: Performance Indexes

> **Dependencies:** Phases 1–9 | **Tables:** 0 | **Endpoints:** 0

#### What It Builds

Composite and filtered indexes for all high-traffic queries:

```bash
/db-migration performance_indexes
```

#### Key Indexes

```sql
-- Inventory lookup (most critical)
CREATE INDEX idx_inventory_lookup
  ON inventory(tenant_id, godown_id, product_id, color, stage);

-- Inventory by batch (filtered)
CREATE INDEX idx_inventory_batch
  ON inventory(tenant_id, batch_id)
  WHERE batch_id IS NOT NULL;

-- Production returns by wager
CREATE INDEX idx_production_returns_wager
  ON production_returns(tenant_id, wager_id, created_at DESC);

-- Invoices by customer + status
CREATE INDEX idx_invoices_customer
  ON invoices(tenant_id, customer_id, status);

-- Unread notifications (filtered)
CREATE INDEX idx_notifications_unread
  ON notifications(tenant_id, user_id, is_read)
  WHERE is_read = false;

-- Unresolved fraud alerts (filtered)
CREATE INDEX idx_fraud_alerts_unresolved
  ON fraud_alerts(tenant_id, is_resolved)
  WHERE is_resolved = false;
```

> **Deep dive:** [06d-platform-phases.md — Phase 13](./plans/06d-platform-phases.md#phase-13-performance-indexes)

---

### Phase 14: API Documentation (Swagger)

> **Dependencies:** Phases 0–12 | **Endpoints:** 1 (`GET /api/docs`)

#### What It Builds

Swagger/OpenAPI documentation for all ~112 endpoints.

#### Commands to Run

```bash
pnpm add swagger-jsdoc swagger-ui-express
pnpm add @types/swagger-jsdoc @types/swagger-ui-express -D

# Add JSDoc annotations to all route files
# Swagger UI at /api/docs
# OpenAPI JSON at /api/docs.json
```

> **Deep dive:** [06d-platform-phases.md — Phase 14](./plans/06d-platform-phases.md#phase-14-api-documentation--swagger)

---

## 6. Teammate Workflow

Claude can be used in different "roles" depending on the task. Think of these as hats you put on.

### Teammate Roster

| #   | Role                 | Agent Used                 | Primary Skills                      | Focus                             |
| --- | -------------------- | -------------------------- | ----------------------------------- | --------------------------------- |
| TM1 | **DB Architect**     | `db-reviewer`              | `/db-migration`, `/generate-seed`   | Migrations, schemas, RLS, indexes |
| TM2 | **Domain Advisor**   | `domain-expert`            | `/spec`                             | Business rules, clarifications    |
| TM3 | **Backend Builder**  | `business-logic-validator` | `/scaffold-module`, `/api-endpoint` | Services, routes, Zod schemas     |
| TM4 | **UX Guardian**      | `ux-auditor`               | `/add-translation`                  | i18n readiness, UI review         |
| TM5 | **QA Engineer**      | `test-runner`              | `/generate-test`                    | Tests, coverage, TDD              |
| TM6 | **Progress Tracker** | `checklist-validator`      | `/review-pr`                        | CL-DB/CL-BE tracking              |
| TM7 | **Challenger**       | `devils-advocate`          | `/review-pr`                        | Stress-testing, edge cases        |

### Pipeline Flow Per Phase

```
TM2 (Domain Advisor) — clarifies requirements
  ↓
TM1 (DB Architect) — writes migrations + RLS + seeds
  ↓
TM3 (Backend Builder) — implements services + routes + Zod
  ↓
TM5 (QA Engineer) — writes & runs tests
  ↓
TM6 (Progress Tracker) — validates checklists
  ↓
TM7 (Challenger) — stress-tests at milestones
  ↓
TM4 (UX Guardian) — reviews i18n + UI readiness
```

### Parallel Lanes

```
Lane A (Build)      │ Lane B (Validate)          │ Lane C (Advisory)
────────────────────┼────────────────────────────┼──────────────────
TM1 → TM3           │ TM5 → TM6 → TM7           │ TM2, TM4
(DB → Backend)      │ (Test → Check → Challenge) │ (On-demand)
Per phase, in       │ On completed phases        │ For any phase
sequence            │ while Lane A moves ahead   │
```

### Handoff Protocol

| From           | To               | Signal                                      |
| -------------- | ---------------- | ------------------------------------------- |
| TM1 (DB)       | TM3 (Backend)    | "Migration `XXXX_create_[table].sql` ready" |
| TM3 (Backend)  | TM5 (QA)         | "Endpoint `[METHOD /path]` implemented"     |
| TM5 (QA)       | TM6 (Progress)   | "All tests pass: X unit, Y integration"     |
| TM6 (Progress) | TM7 (Challenger) | "Phase N: X/Y CL-DB, A/B CL-BE items done"  |

---

## 7. Quality Gates & Milestones

### Per-Phase Verification (Every Phase)

Every phase must pass this gate before proceeding:

- [ ] All unit tests pass (`pnpm test -- --run`)
- [ ] All integration tests pass
- [ ] Curl manual testing done (see [06e-curl-reference.md](./plans/06e-curl-reference.md))
- [ ] `db-reviewer` approved (if phase has migrations)
- [ ] `business-logic-validator` approved (if phase has business logic)
- [ ] `checklist-validator` confirmed coverage (CL-DB + CL-BE items)
- [ ] i18n keys added for all user-facing strings
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint warnings (`pnpm lint`)

### Milestone Reviews (4 Phases)

At these phases, invoke `devils-advocate` for a comprehensive review:

| Phase                    | What Gets Stress-Tested                                         |
| ------------------------ | --------------------------------------------------------------- |
| **Phase 1** (Foundation) | Tenant isolation, auth bypass attempts, permission escalation   |
| **Phase 5** (Production) | Production accuracy, fraud detection, inventory consistency     |
| **Phase 8** (Wages)      | Wage formula correctness, advance balance integrity, edge cases |
| **Phase 9** (Sales)      | GST calculations, payment enforcement, invoice lifecycle        |

### Progress Dashboard Template

Track overall progress by running `checklist-validator` after each phase:

```
Phase  0 [##########] 100%  ← Setup
Phase  1 [########--]  80%  ← Foundation
Phase  2 [####------]  40%  ← Master Data
Phase  3 [----------]   0%  ← Batch
...
Phase 14 [----------]   0%  ← Swagger

CL-DB: 42/148 items (28%)
CL-BE: 38/149 items (26%)
Tests: 124 passing, 0 failing
```

### Cumulative Progress Reference

| Phase | Tables | Endpoints | Running Total (Endpoints) |
| ----- | ------ | --------- | ------------------------- |
| 0     | 0      | 1         | 1                         |
| 1     | 6      | 20        | 21                        |
| 2     | 9      | 30        | 51                        |
| 3     | 1      | 3         | 54                        |
| 4     | 4      | 7         | 61                        |
| 5     | 5      | 14        | 75                        |
| 6     | 1      | 3+        | 78+                       |
| 7     | 2      | 6+        | 84+                       |
| 8     | 3      | 10        | 94+                       |
| 9     | 3      | 10        | 104+                      |
| 10    | 2      | 6         | 110+                      |
| 11    | 0      | 14        | 124+                      |
| 12    | 0      | 0         | 124+                      |
| 13    | 0      | 0         | 124+                      |
| 14    | 0      | 1         | ~125                      |

**Totals:** 36 tables, ~125 endpoints, 148 CL-DB items, 149 CL-BE items

---

## 8. Tips & Troubleshooting

### Common Patterns

**Start every module the same way:**

```bash
/generate-test <module> unit      # RED — tests first
/db-migration <table>             # GREEN — schema
/scaffold-module <module>         # GREEN — implementation
pnpm test -- --run                # Verify GREEN
```

**Check the spec when unsure:**

```bash
/spec <topic>
# Examples:
/spec wager types
/spec damage deduction formula
/spec GST intra-state vs inter-state
/spec customer types
```

**Add translations as you go, not at the end:**

```bash
/add-translation <key> <english> <tamil>
```

### Conflict Detection

If a generator overwrites an existing file:

- Generators use `writeFile()` which overwrites — run them on new modules only
- Use `/api-endpoint` to add endpoints to existing modules (creates snippet files, doesn't overwrite)
- If you accidentally overwrite, `git checkout -- <file>` to recover

### Re-Running Generators

Generators are safe to re-run for new tables/modules but will overwrite existing files with the same name. To regenerate a single file:

```bash
# Regenerate just the migration
pnpm gen:migration <table_name>

# Regenerate just the module scaffold
pnpm gen:module <module_name>

# Regenerate just the test
pnpm gen:test <module_name> --unit
```

### Feature Flag Checks

Several features are gated by `tenant_settings` flags. Always check:

| Flag                            | What It Gates                                                   |
| ------------------------------- | --------------------------------------------------------------- |
| `batch_enabled`                 | All batch endpoints (Phase 3), batch_id in inventory/production |
| `shift_enabled`                 | Shift wage rates (Phase 2), shift tracking (Phase 5)            |
| `inter_godown_transfer_enabled` | Transfer endpoints (Phase 4)                                    |
| `auth_otp_enabled`              | OTP send/verify endpoints (Phase 1)                             |
| `auth_pin_enabled`              | PIN verify endpoint (Phase 1)                                   |

### Testing Tips

```bash
# Run all tests
pnpm test -- --run

# Run tests for a specific module
pnpm test -- --run src/modules/<module>/__tests__/*.test.ts

# Run only integration tests
pnpm test -- --run tests/integration/

# Run with coverage
pnpm test -- --run --coverage
```

### When Things Go Wrong

| Problem                                | Solution                                                          |
| -------------------------------------- | ----------------------------------------------------------------- |
| Migration fails                        | Check FK dependencies — tables must be created in order           |
| RLS blocks all queries                 | Verify `SET app.tenant_id` is called in `tenantScope` middleware  |
| Tests pass locally but fail in CI      | Check `TEST_DATABASE_URL` and that test DB has pgcrypto extension |
| Generator creates wrong file structure | Check `scripts/lib/naming.ts` for name conversion logic           |
| Agent gives incorrect validation       | Cross-reference with `/spec <topic>` for ground truth             |

---

## References

| Document                   | Path                                                                          | Purpose                                  |
| -------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------- |
| V3 Specification           | [`docs/powerloom-erp-v3.md`](./powerloom-erp-v3.md)                           | Source of truth                          |
| Client Q&A                 | [`docs/questions.txt`](./questions.txt)                                       | Clarifications                           |
| Implementation Guide (Hub) | [`docs/plans/06-implementation-guide.md`](./plans/06-implementation-guide.md) | Phase overview, methodology              |
| Foundation Phases (0-2)    | [`docs/plans/06a-foundation-phases.md`](./plans/06a-foundation-phases.md)     | Detailed Phase 0, 1, 2 instructions      |
| Core Phases (3-7)          | [`docs/plans/06b-core-phases.md`](./plans/06b-core-phases.md)                 | Detailed Phase 3-7 instructions          |
| Financial Phases (8-9)     | [`docs/plans/06c-financial-phases.md`](./plans/06c-financial-phases.md)       | Detailed Phase 8-9 instructions          |
| Platform Phases (10-14)    | [`docs/plans/06d-platform-phases.md`](./plans/06d-platform-phases.md)         | Detailed Phase 10-14 instructions        |
| Curl Reference             | [`docs/plans/06e-curl-reference.md`](./plans/06e-curl-reference.md)           | Manual testing commands (~112 endpoints) |
| Checklist Matrix           | [`docs/plans/06f-checklist-matrix.md`](./plans/06f-checklist-matrix.md)       | CL-DB (148) + CL-BE (149) tracking       |
| Project Conventions        | [`CLAUDE.md`](../CLAUDE.md)                                                   | Tech stack, domain terms, conventions    |
