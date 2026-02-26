# Implementation Guide — Powerloom ERP V3

> **Hub document** — Start here, then follow links to phase files.

---

## 1. How to Use This Guide

### Reading Order

1. **This file** (`06-implementation-guide.md`) — Overview, methodology, teammates, phase index
2. **Phase files** (`06a` through `06d`) — Detailed per-phase instructions
3. **Curl reference** (`06e`) — Manual testing commands for all endpoints
4. **Checklist matrix** (`06f`) — Track CL-DB / CL-BE completion

### Conventions

| Symbol                       | Meaning                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `RED` / `GREEN` / `REFACTOR` | TDD cycle stages                                        |
| `CL-DB-XX.Y`                 | DB checklist item (from `02-database-checklist.md`)     |
| `CL-BE-XX.Y`                 | Backend checklist item (from `04-backend-checklist.md`) |
| `TM1`–`TM7`                  | Claude Teammate identifiers                             |
| `/skill-name [args]`         | Skill invocation syntax                                 |
| `Phase N → Phase M`          | Dependency (N must complete before M)                   |
| `IT-X.Y`                     | Integration test identifier                             |

### File Map

| File                         | Content                                                   | Phases             |
| ---------------------------- | --------------------------------------------------------- | ------------------ |
| `06-implementation-guide.md` | Hub — overview, methodology, teammates, phase index       | —                  |
| `06a-foundation-phases.md`   | Setup + Foundation + Master Data                          | 0, 1, 2            |
| `06b-core-phases.md`         | Batch + Inventory + Production + Damage + Post-Production | 3, 4, 5, 6, 7      |
| `06c-financial-phases.md`    | Wage & Advance + Sales & Finance                          | 8, 9               |
| `06d-platform-phases.md`     | Notifications + Reports + Jobs + Indexes + Swagger        | 10, 11, 12, 13, 14 |
| `06e-curl-reference.md`      | Complete curl commands for all ~112 endpoints             | All                |
| `06f-checklist-matrix.md`    | Full CL-DB/CL-BE to phase + teammate mapping              | All                |

---

## 2. Quick Reference Card

### Skills (8)

| #   | Skill           | Command Syntax                                | Purpose                                                                 |
| --- | --------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| S1  | DB Migration    | `/db-migration [table_name]`                  | Create migration with `tenant_id`, RLS policies, indexes                |
| S2  | Scaffold Module | `/scaffold-module [module_name]`              | Full module: routes, Zod schema, types, service, repository, tests      |
| S3  | Generate Test   | `/generate-test [module] [unit\|integration]` | TDD test file (RED phase) for a module or endpoint                      |
| S4  | API Endpoint    | `/api-endpoint [METHOD /path]`                | Single endpoint: route handler, service method, Zod validation, test    |
| S5  | Generate Seed   | `/generate-seed [table_name]`                 | Tenant-aware seed data with realistic powerloom industry values         |
| S6  | Add Translation | `/add-translation [key] [en_text] [ta_text]`  | i18n translation key for English + Tamil                                |
| S7  | Spec            | `/spec [topic]`                               | Quick-reference the Powerloom ERP V3 specification                      |
| S8  | Review PR       | `/review-pr [pr_number]`                      | Domain-specific PR review with tenant isolation + business logic checks |

### Agents (7)

| #   | Agent                      | Trigger Type                   | Model  | Max Turns | Purpose                                                             |
| --- | -------------------------- | ------------------------------ | ------ | --------- | ------------------------------------------------------------------- |
| A1  | `db-reviewer`              | Proactive (on migrations)      | Sonnet | 10        | Validates schema, RLS policies, indexes, FK integrity, naming       |
| A2  | `domain-expert`            | Manual                         | Sonnet | 10        | Clarifies business rules, wager types, wage formulas, textile terms |
| A3  | `business-logic-validator` | Proactive (on services)        | Sonnet | 12        | Validates service logic against V3 spec and business rules          |
| A4  | `ux-auditor`               | Proactive (on UI components)   | Sonnet | 10        | Enforces 48px targets, large fonts, i18n, one-tap actions           |
| A5  | `test-runner`              | Proactive (after code changes) | Haiku  | 8         | Executes tests, reports pass/fail, suggests fixes                   |
| A6  | `checklist-validator`      | Manual                         | Sonnet | 15        | Scans codebase against CL-DB (148) + CL-BE (149) items              |
| A7  | `devils-advocate`          | Manual (at milestones)         | Sonnet | 12        | Stress-tests designs, finds edge cases, challenges assumptions      |

### Phase Overview (15 Phases)

| Phase | Name                             | Dependencies | DB Epic | BE Epic | Endpoints | File                                      |
| ----- | -------------------------------- | ------------ | ------- | ------- | --------- | ----------------------------------------- |
| 0     | Project Setup & Middleware       | —            | —       | 1       | 1         | [06a](./06a-foundation-phases.md#phase-0) |
| 1     | Foundation: Tenants, Users, Auth | 0            | 1       | 1, 2, 3 | 20        | [06a](./06a-foundation-phases.md#phase-1) |
| 2     | Master Data                      | 1            | 2       | 4       | 30        | [06a](./06a-foundation-phases.md#phase-2) |
| 3     | Batch System                     | 1            | 3       | 5       | 3         | [06b](./06b-core-phases.md#phase-3)       |
| 4     | Inventory & Raw Materials        | 2, 3         | 4       | 6       | 7         | [06b](./06b-core-phases.md#phase-4)       |
| 5     | Production System                | 4            | 5       | 7       | 14        | [06b](./06b-core-phases.md#phase-5)       |
| 6     | Damage Management                | 5            | 6       | 8       | 6         | [06b](./06b-core-phases.md#phase-6)       |
| 7     | Post-Production                  | 5            | 7       | 9       | 4         | [06b](./06b-core-phases.md#phase-7)       |
| 8     | Wage & Advance                   | 5, 6, 7      | 8       | 10      | 10        | [06c](./06c-financial-phases.md#phase-8)  |
| 9     | Sales & Finance                  | 2, 4         | 9       | 11      | 10        | [06c](./06c-financial-phases.md#phase-9)  |
| 10    | Notifications & Alerts           | 8, 9         | 10      | 12      | 6         | [06d](./06d-platform-phases.md#phase-10)  |
| 11    | Reports                          | 5–9          | —       | 13      | 14        | [06d](./06d-platform-phases.md#phase-11)  |
| 12    | Scheduled Jobs                   | 8, 9, 10     | —       | 14      | 0         | [06d](./06d-platform-phases.md#phase-12)  |
| 13    | Performance Indexes              | 1–9          | 11      | —       | 0         | [06d](./06d-platform-phases.md#phase-13)  |
| 14    | API Documentation (Swagger)      | 0–12         | —       | —       | 1         | [06d](./06d-platform-phases.md#phase-14)  |

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

## 3. Environment Setup

### Prerequisites

- Node.js >= 18 LTS
- PostgreSQL 15+ (Supabase hosted or local)
- pnpm (preferred) or npm
- Git

### Environment Variables

```env
# .env
DATABASE_URL=postgresql://user:pass@localhost:5432/powerloom_erp
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/powerloom_erp_test

JWT_SECRET=your-256-bit-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

SMS_PROVIDER=mock  # mock | twilio | msg91
SMS_API_KEY=
SMS_SENDER_ID=

FCM_SERVICE_ACCOUNT=

PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

### Database Setup

```bash
# Create development and test databases
createdb powerloom_erp
createdb powerloom_erp_test

# Enable UUID extension
psql powerloom_erp -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
psql powerloom_erp_test -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
```

### Project Initialization

```bash
# Initialize project
pnpm init
pnpm add typescript tsx @types/node

# Framework
pnpm add express cors helmet
pnpm add @types/express @types/cors -D

# Database
pnpm add drizzle-orm postgres
pnpm add drizzle-kit -D

# Validation & Auth
pnpm add zod jsonwebtoken bcryptjs
pnpm add @types/jsonwebtoken @types/bcryptjs -D

# Testing
pnpm add -D vitest @vitest/coverage-v8 supertest @types/supertest

# Logging
pnpm add pino pino-pretty

# TypeScript config
npx tsc --init --strict
```

### Directory Structure

```
powerloom-erp/
├── src/
│   ├── app.ts                    # Express app setup
│   ├── server.ts                 # Server entry point
│   ├── config/
│   │   ├── database.ts           # DB connection pool
│   │   ├── env.ts                # Environment validation
│   │   └── logger.ts             # Pino logger setup
│   ├── middleware/
│   │   ├── authenticate.ts       # JWT verification
│   │   ├── authorize.ts          # Role-based access
│   │   ├── tenantScope.ts        # RLS tenant context
│   │   ├── validate.ts           # Zod validation
│   │   ├── errorHandler.ts       # Global error handler
│   │   └── requestLogger.ts      # Request logging
│   ├── modules/
│   │   ├── auth/
│   │   ├── tenants/
│   │   ├── users/
│   │   ├── loom-types/
│   │   ├── looms/
│   │   ├── products/
│   │   ├── suppliers/
│   │   ├── customers/
│   │   ├── godowns/
│   │   ├── wagers/
│   │   ├── batches/
│   │   ├── cone-purchases/
│   │   ├── inventory/
│   │   ├── transfers/
│   │   ├── cone-issuances/
│   │   ├── paavu-productions/
│   │   ├── production-returns/
│   │   ├── loom-downtimes/
│   │   ├── shifts/
│   │   ├── damage-records/
│   │   ├── tailoring-records/
│   │   ├── packaging-records/
│   │   ├── advances/
│   │   ├── wage-cycles/
│   │   ├── invoices/
│   │   ├── payments/
│   │   ├── notifications/
│   │   ├── fraud-alerts/
│   │   └── reports/
│   ├── shared/
│   │   ├── base.repository.ts    # BaseRepository<T>
│   │   ├── audit.service.ts      # Audit logging
│   │   ├── transaction.ts        # withTransaction()
│   │   └── errors.ts             # AppError class
│   └── types/
│       ├── enums.ts              # All enum types
│       ├── models.ts             # Shared model interfaces
│       └── api.ts                # Request/response types
├── migrations/                   # SQL migration files
├── seeds/                        # Seed data files
├── tests/
│   ├── utils/
│   │   └── test-helpers.ts       # Test utilities
│   └── integration/              # Cross-module integration tests
├── packages/
│   └── shared/                   # Shared types package
├── locales/
│   ├── en.json                   # English translations
│   └── ta.json                   # Tamil translations
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── drizzle.config.ts
```

---

## 4. TDD Methodology

### Red-Green-Refactor Template

Every task in every phase follows this cycle:

```
┌─────────────────────────────────────────────┐
│  1. RED    — Write failing test first       │
│  2. GREEN  — Write minimum code to pass     │
│  3. REFACTOR — Clean up, extract, optimize  │
└─────────────────────────────────────────────┘
```

#### Step 1: RED — Write Failing Tests

```bash
# Invoke the generate-test skill
/generate-test [module] unit

# Or for integration tests
/generate-test [module] integration
```

Run the test — it **MUST** fail (no implementation yet):

```bash
pnpm test -- --run src/modules/[module]/__tests__/[module].unit.test.ts
```

#### Step 2: GREEN — Implement

```bash
# DB changes (if needed)
/db-migration [table_name]

# New module scaffold (if new module)
/scaffold-module [module_name]

# Individual endpoint
/api-endpoint [METHOD /path]

# Seed data for testing
/generate-seed [table_name]
```

Write the minimum code to make the test pass. Run the test again — it **MUST** pass.

#### Step 3: REFACTOR — Clean Up

- Extract shared logic into utilities
- Optimize database queries
- Ensure naming conventions (`snake_case` DB, `camelCase` TS)
- Add i18n keys: `/add-translation [key] [en] [ta]`

### Test File Naming

```
src/modules/[module]/__tests__/
  [module].unit.test.ts           # Unit tests (services, validation)
  [module].integration.test.ts    # Integration tests (full API flow)

tests/integration/
  phase-[N].integration.test.ts   # Cross-module integration tests
```

### Test Utility Functions

```typescript
// tests/utils/test-helpers.ts

/** Create a test tenant with default settings */
createTestTenant(overrides?: Partial<Tenant>): Promise<{ tenant: Tenant; settings: TenantSettings }>

/** Create a test user with JWT token */
createTestUser(tenantId: string, role: UserRole, overrides?: Partial<User>): Promise<{ user: User; token: string }>

/** Get auth token for an existing user */
getAuthToken(user: User): string

/** Create a fully configured test product */
createTestProduct(tenantId: string, overrides?: Partial<Product>): Promise<Product>

/** Create a wager with profile */
createTestWager(tenantId: string, wagerType: 1|2|3|4): Promise<{ user: User; profile: WagerProfile; token: string }>

/** Clean up all test data (call in afterEach/afterAll) */
cleanupTestData(): Promise<void>

/** Get supertest agent with auth headers */
authRequest(token: string): SuperTest
```

### Test Categories per Phase

| Category                | What It Tests                               | When to Write        |
| ----------------------- | ------------------------------------------- | -------------------- |
| Schema tests            | Migration ran, columns exist, types correct | RED phase (DB)       |
| Validation tests        | Zod schemas reject invalid input            | RED phase (API)      |
| Service unit tests      | Business logic in isolation                 | RED phase (service)  |
| Route integration tests | Full HTTP request → response                | RED phase (endpoint) |
| Cross-module tests      | Multi-service workflows                     | After GREEN phase    |
| Tenant isolation tests  | Data cannot leak between tenants            | Every phase          |

---

## 5. Claude Teammates Workflow

### Teammate Roster

| #   | Teammate             | Agent                      | Role                                                | Primary Skills                      |
| --- | -------------------- | -------------------------- | --------------------------------------------------- | ----------------------------------- |
| TM1 | **DB Architect**     | `db-reviewer`              | Writes migrations, schemas, RLS, indexes            | `/db-migration`, `/generate-seed`   |
| TM2 | **Domain Advisor**   | `domain-expert`            | Clarifies business rules, reviews spec alignment    | `/spec`                             |
| TM3 | **Backend Builder**  | `business-logic-validator` | Implements services, routes, Zod schemas            | `/scaffold-module`, `/api-endpoint` |
| TM4 | **UX Guardian**      | `ux-auditor`               | Reviews frontend components, ensures i18n readiness | `/add-translation`                  |
| TM5 | **QA Engineer**      | `test-runner`              | Writes and runs tests, ensures coverage             | `/generate-test`                    |
| TM6 | **Progress Tracker** | `checklist-validator`      | Tracks CL-DB/CL-BE completion, maintains docs       | `/review-pr`                        |
| TM7 | **Challenger**       | `devils-advocate`          | Stress-tests designs, finds edge cases, reviews PRs | `/review-pr`                        |

### Pipeline Flow Per Phase

```
TM2 (Domain Advisor) clarifies requirements
    ↓
TM1 (DB Architect) writes migrations + RLS + seeds
    ↓
TM3 (Backend Builder) implements services + routes + Zod schemas
    ↓
TM5 (QA Engineer) writes & runs tests (unit + integration)
    ↓
TM6 (Progress Tracker) validates checklists (CL-DB + CL-BE)
    ↓
TM7 (Challenger) stress-tests at milestone phases
    ↓
TM4 (UX Guardian) reviews i18n keys + UI readiness
```

### Parallel Lanes

```
Lane A (Build)     │ Lane B (Validate)      │ Lane C (Advisory)
───────────────────┼────────────────────────┼──────────────────
TM1 → TM3          │ TM5 → TM6 → TM7       │ TM2, TM4
(DB → Backend)     │ (Test → Check → Challenge) │ (On-demand)
per phase, in      │ on completed phases    │ for any phase
sequence           │ while Lane A moves ahead│
```

- **Lane A** works on the current phase
- **Lane B** validates the previous phase while Lane A moves to the next
- **Lane C** teammates are consultants called on-demand for any phase

### Quality Gates

| Gate           | When                        | Who Runs                                          | What Happens                              |
| -------------- | --------------------------- | ------------------------------------------------- | ----------------------------------------- |
| **Post-Phase** | After every phase completes | TM5 (`test-runner`) + TM6 (`checklist-validator`) | All tests pass, checklist items confirmed |
| **Milestone**  | After Phases 1, 5, 8, 9     | TM7 (`devils-advocate`)                           | Full stress-test of accumulated system    |
| **Pre-Merge**  | Before any PR merge         | TM6 (`/review-pr`)                                | Domain-specific code review               |

### Handoff Protocol

| From           | To               | Artifact                       | Signal                                      |
| -------------- | ---------------- | ------------------------------ | ------------------------------------------- |
| TM1 (DB)       | TM3 (Backend)    | Migration files + schema types | "Migration `XXXX_create_[table].sql` ready" |
| TM3 (Backend)  | TM5 (QA)         | Route + service + repository   | "Endpoint `[METHOD /path]` implemented"     |
| TM5 (QA)       | TM6 (Progress)   | Test results (all passing)     | "All tests pass: X unit, Y integration"     |
| TM6 (Progress) | TM7 (Challenger) | Checklist coverage report      | "Phase N: X/Y CL-DB, A/B CL-BE items done"  |

---

## 6. Phase Index

### Foundation (File: 06a)

| Phase                                                                                                           | Section     | Key Deliverables                                                                |
| --------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| [Phase 0: Project Setup & Middleware](./06a-foundation-phases.md#phase-0-project-setup--middleware)             | Setup       | Express app, middleware stack, health check, test framework                     |
| [Phase 1: Foundation — Tenants, Users, Auth](./06a-foundation-phases.md#phase-1-foundation--tenants-users-auth) | Foundation  | 6 DB tables, RLS policies, auth endpoints, user management                      |
| [Phase 2: Master Data](./06a-foundation-phases.md#phase-2-master-data)                                          | Master Data | 9 DB tables, all CRUD endpoints for loom/product/supplier/customer/godown/wager |

### Core Operations (File: 06b)

| Phase                                                                                       | Section    | Key Deliverables                                                          |
| ------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| [Phase 3: Batch System](./06b-core-phases.md#phase-3-batch-system)                          | Batch      | Batch table, feature flag, lifecycle management                           |
| [Phase 4: Inventory & Raw Materials](./06b-core-phases.md#phase-4-inventory--raw-materials) | Inventory  | 4 DB tables, cone purchase, stock queries, inter-godown transfer          |
| [Phase 5: Production System](./06b-core-phases.md#phase-5-production-system)                | Production | 5 DB tables, cone issuance, paavu, returns, downtime, shifts, performance |
| [Phase 6: Damage Management](./06b-core-phases.md#phase-6-damage-management)                | Damage     | Damage table, grading, approval workflow, deduction calculation           |
| [Phase 7: Post-Production](./06b-core-phases.md#phase-7-post-production)                    | Post-Prod  | Tailoring + packaging tables, wage auto-calc, inventory transitions       |

### Financial (File: 06c)

| Phase                                                                        | Section | Key Deliverables                                                         |
| ---------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| [Phase 8: Wage & Advance](./06c-financial-phases.md#phase-8-wage--advance)   | Wages   | 3 DB tables, advance tracking, wage cycle generation, all 4 worker types |
| [Phase 9: Sales & Finance](./06c-financial-phases.md#phase-9-sales--finance) | Sales   | 3 DB tables, invoices, GST, payments, overdue detection, e-way bill      |

### Platform (File: 06d)

| Phase                                                                                       | Section       | Key Deliverables                                             |
| ------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| [Phase 10: Notifications & Alerts](./06d-platform-phases.md#phase-10-notifications--alerts) | Notifications | 2 DB tables, 11 event triggers, 7 fraud types, FCM push      |
| [Phase 11: Reports](./06d-platform-phases.md#phase-11-reports)                              | Reports       | 14 report endpoints across 4 categories                      |
| [Phase 12: Scheduled Jobs](./06d-platform-phases.md#phase-12-scheduled-jobs)                | Jobs          | node-cron setup, 4 scheduled tasks                           |
| [Phase 13: Performance Indexes](./06d-platform-phases.md#phase-13-performance-indexes)      | Indexes       | Composite indexes for all high-traffic queries               |
| [Phase 14: API Documentation](./06d-platform-phases.md#phase-14-api-documentation--swagger) | Swagger       | swagger-jsdoc + swagger-ui-express, all endpoints documented |

### Supporting Documents

| File                                                 | Purpose                                       |
| ---------------------------------------------------- | --------------------------------------------- |
| [06e-curl-reference.md](./06e-curl-reference.md)     | Complete curl commands for all ~112 endpoints |
| [06f-checklist-matrix.md](./06f-checklist-matrix.md) | Full CL-DB/CL-BE to phase + teammate mapping  |

---

## 7. Verification Checklist (Per Phase)

Every phase must pass this gate before proceeding to the next:

- [ ] All unit tests pass (`pnpm test -- --run`)
- [ ] All integration tests pass
- [ ] Curl manual testing done (see `06e-curl-reference.md`)
- [ ] `db-reviewer` approved (if phase has migrations)
- [ ] `business-logic-validator` approved (if phase has business logic)
- [ ] `checklist-validator` confirmed coverage (CL-DB + CL-BE items)
- [ ] `devils-advocate` challenged (at milestone phases: 1, 5, 8, 9)
- [ ] i18n keys added for all user-facing strings
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint warnings (`pnpm lint`)

---

## 8. Progress Dashboard Template

Track overall progress using this template:

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

Update this after each phase by running `checklist-validator`.

---

## References

| Document         | Path                                  | Purpose                               |
| ---------------- | ------------------------------------- | ------------------------------------- |
| V3 Specification | `docs/powerloom-erp-v3.md`            | Source of truth                       |
| Client Q&A       | `docs/questions.txt`                  | Clarifications                        |
| Database Plan    | `docs/plans/01-database-plan.md`      | 36 tables, migration order            |
| DB Checklist     | `docs/plans/02-database-checklist.md` | 148 validation items                  |
| Backend Plan     | `docs/plans/03-backend-plan.md`       | 14 epics, ~112 endpoints              |
| BE Checklist     | `docs/plans/04-backend-checklist.md`  | 149 validation items                  |
| Cross-Validation | `docs/plans/05-cross-validation.md`   | DB ↔ BE alignment proof               |
| Project Config   | `CLAUDE.md`                           | Tech stack, conventions, domain terms |
