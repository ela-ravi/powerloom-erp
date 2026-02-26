---
name: db-migration
description: Create a new database migration with tenant isolation and RLS
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: [table-name]
---

Create a new PostgreSQL migration for table `$0`.

## Step 1: Generate Template

Run the template generator to create the migration boilerplate:

```bash
pnpm gen:migration $0
```

This creates `src/db/migrations/YYYYMMDDHHMMSS_create_<table>.sql` with:

- CREATE TABLE with id, tenant_id, timestamps
- RLS policy with tenant isolation
- updated_at trigger
- Index on tenant_id
- TODO placeholders for columns and indexes

## Step 2: Customize

1. Read `CLAUDE.md` for database conventions.
2. Read `docs/plans/01-database-plan.md` to find the table's column definitions.
3. Read existing migrations to follow the established pattern (naming, structure, ordering).
4. Fill in the TODO sections in the generated file:
   - Add module-specific columns with correct types and constraints
   - Add foreign key constraints
   - Add indexes for frequently queried columns
   - Add any ENUM types needed
5. Run the `db-reviewer` agent to validate the migration.

## Migration Rules

Every migration MUST include:

### Table Creation

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `tenant_id UUID NOT NULL REFERENCES tenants(id)`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### Row-Level Security

- RLS enabled with tenant isolation policy using `app.current_tenant_id`

### Indexes

- Always index `tenant_id`
- Add indexes for columns that will be frequently queried or filtered

### Updated_at Trigger

- Auto-update trigger using `trigger_set_updated_at()`

## Naming Conventions

- Table names: `snake_case`, plural (e.g., `wager_productions`, `damage_reports`)
- Column names: `snake_case`
- Foreign keys: `referenced_table_singular_id` (e.g., `wager_id`, `product_id`)
- Migration file: timestamp prefix (e.g., `20260215120000_create_$0.sql`)

## After Creation

- Show the full migration SQL
- List any foreign key dependencies that must exist first
- Suggest the corresponding TypeScript types
