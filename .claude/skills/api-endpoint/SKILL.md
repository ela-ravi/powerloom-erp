---
name: api-endpoint
description: Scaffold a single API endpoint with route, service, validation, and test
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint:
  [METHOD /api/path module-name e.g. "POST /api/cone-purchases cone-purchase"]
---

Scaffold a single API endpoint: `$ARGUMENTS`

## Step 1: Generate Template

Parse the arguments as `METHOD /api/path module-name` and run:

```bash
pnpm gen:endpoint METHOD /api/path module-name
```

This creates a snippet file in `src/modules/<module>/_generated/` with labeled code blocks:

- `// --- PASTE INTO: routes.ts ---` (route handler)
- `// --- PASTE INTO: schema.ts ---` (Zod schema)
- `// --- PASTE INTO: service.ts ---` (service method)
- `// --- ADD TO: service.test.ts ---` (unit test)
- `// --- ADD TO: api.test.ts ---` (integration test)

## Step 2: Customize

1. Read `CLAUDE.md` for code conventions.
2. Read `docs/plans/03-backend-plan.md` to find this endpoint's spec (story, task, sub-tasks, expected tests).
3. Read `docs/plans/04-backend-checklist.md` to find the matching checklist item.
4. Read `docs/plans/01-database-plan.md` for the DB tables this endpoint touches.
5. Read existing route/service/test files to follow established patterns.
6. Fill in TODO sections in the snippet, then paste each block into the correct file.

## What to Generate

### 1. Route Handler

```typescript
// src/routes/module-name.routes.ts (append to existing or create)
router.METHOD(
  "/path",
  authenticate, // JWT auth
  authorize(["owner", "staff"]), // Role check (from plan)
  validate(schemaName), // Zod validation
  controllerMethod, // Handler
);
```

- Apply `authenticate` middleware to all routes
- Apply `authorize()` with the correct roles from the plan
- Apply `validate()` with the Zod schema
- Tenant scoping is handled by `tenantScope` middleware (applied globally)

### 2. Zod Validation Schema

```typescript
// src/schemas/module-name.schema.ts (append or create)
export const createSomethingSchema = z.object({
  // Required fields from DB plan
  // Correct types: z.string().uuid(), z.number().positive(), z.enum([...])
  // No tenant_id in request body (injected by middleware)
});
```

Rules:

- NEVER include `tenant_id` in request schemas (middleware injects it)
- NEVER include `id`, `created_at`, `updated_at` in create schemas
- Use `z.enum()` for PostgreSQL ENUM columns
- Use `z.number().positive()` for quantities and amounts
- Use `z.string().uuid()` for foreign key references
- Use `.optional()` for nullable DB columns
- Mark batch_id as conditional: `z.string().uuid().optional()` (required only when tenant has batching enabled — validate in service layer)

### 3. Service Method

```typescript
// src/services/module-name.service.ts (append or create)
export class ModuleService {
  constructor(private repo: ModuleRepository) {}

  async methodName(tenantId: string, dto: CreateDTO): Promise<ResponseType> {
    // 1. Business logic validation
    // 2. Database operation (via repository)
    // 3. Side effects (inventory update, notification, etc.)
    // 4. Return response
  }
}
```

Rules:

- First parameter is ALWAYS `tenantId`
- Use repository pattern (extends BaseRepository)
- Wrap multi-table operations in transactions
- Implement business logic from the spec (reference domain-expert agent if complex)
- Throw `AppError` with appropriate HTTP status codes

### 4. Repository Method (if needed)

```typescript
// src/repositories/module-name.repository.ts
export class ModuleRepository extends BaseRepository<Module> {
  // BaseRepository provides: findById, findAll, create, update, delete
  // Only add custom query methods here
}
```

### 5. Unit Test (TDD — write FIRST)

```typescript
// src/__tests__/unit/module-name.service.test.ts
describe("ModuleService.methodName", () => {
  it("should [happy path]", async () => {});
  it("should reject invalid [field]", async () => {});
  it("should enforce tenant isolation", async () => {});
  // Business-logic-specific tests from plan
});
```

### 6. Integration Test

```typescript
// src/__tests__/integration/module-name.api.test.ts
describe("METHOD /api/path", () => {
  it("should return [status] on success", async () => {});
  it("should return 401 without auth", async () => {});
  it("should return 403 for wrong role", async () => {});
  it("should return 400 for invalid body", async () => {});
  it("should not expose other tenant data", async () => {});
});
```

## Checklist Cross-Reference

After generating, note:

- Which Backend Checklist item (CL-BE-XX.Y) this endpoint fulfills
- Which DB Checklist item (CL-DB-XX.Y) it depends on
- Whether the DB migration for the underlying table exists

## Output

List:

1. All files created/modified
2. The endpoint signature: `METHOD /api/path → StatusCode ResponseType`
3. Roles that can access this endpoint
4. Zod schema fields
5. Checklist items covered (CL-BE and CL-DB references)
6. Test count (unit + integration)
