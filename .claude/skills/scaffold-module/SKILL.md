---
name: scaffold-module
description: Scaffold a new ERP module with routes, schema, types, and tests
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: [module-name]
---

Scaffold a new ERP module named `$0` for the Powerloom ERP system.

## Step 1: Generate Template

Run the template generator to create all module files:

```bash
pnpm gen:module $0
```

This creates 7 files in `src/modules/<module-name>/`:

- `<name>.routes.ts` — Router with CRUD endpoints, auth/validate middleware
- `<name>.schema.ts` — Zod create/update/query schemas with type exports
- `<name>.types.ts` — Interface, DTO, and ListParams types
- `<name>.service.ts` — Service class with CRUD methods
- `<name>.repository.ts` — Repository extending BaseRepository
- `__tests__/<name>.service.test.ts` — Unit test skeleton
- `__tests__/<name>.api.test.ts` — Integration test skeleton

## Step 2: Customize

1. Read `CLAUDE.md` for project conventions and `docs/powerloom-erp-v3.md` for domain context.
2. Read `docs/plans/01-database-plan.md` for the table schema.
3. Read `docs/plans/03-backend-plan.md` for the module's API spec.
4. Fill in TODO sections across all generated files:
   - **types.ts** — Add fields matching the database columns (camelCase)
   - **schema.ts** — Add Zod fields with proper types and constraints
   - **service.ts** — Add business logic, validation, and side effects
   - **repository.ts** — Add custom query methods if needed
   - **routes.ts** — Add module-specific routes beyond CRUD
   - **tests** — Add assertions, mocks, and domain-specific scenarios
5. Run the `db-reviewer` agent for any migration.
6. Run the `ux-auditor` agent if UI components are involved.

## Module Rules

### Database Schema

- MUST include `tenant_id` column (UUID, NOT NULL, references tenants)
- Add Row-Level Security (RLS) policy scoped by `tenant_id`
- Name convention: `snake_case` for all columns and tables

### TypeScript Types

- Shared type definitions (used by both web and mobile)
- Input validation schemas (Zod) — no tenant_id in request body
- Database row type + API response type + create/update DTOs

### API Routes

- CRUD endpoints following RESTful conventions
- Tenant middleware applied to all routes
- Input validation on all write operations

### Tests

- At least one test per endpoint (happy path)
- Test tenant isolation (ensure cross-tenant data is not accessible)

### Translation Keys

- Run `pnpm gen:translation $0` separately if translation keys are needed
- Key format: `module_name.action.label` (e.g., `inventory.create.title`)

## Output

After scaffolding, list all created files and explain what each one does.
