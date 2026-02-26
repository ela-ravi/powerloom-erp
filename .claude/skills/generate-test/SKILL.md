---
name: generate-test
description: Generate TDD test files (unit or integration) for a module or endpoint
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: [module-name or endpoint-path]
---

Generate test files for `$ARGUMENTS` following TDD Red-Green-Refactor methodology.

## Step 1: Generate Template

Run the template generator to create test file skeletons:

```bash
pnpm gen:test $0 --both
```

Options: `--unit` (unit only), `--integration` (integration only), `--both` (default).

This creates in `src/modules/<name>/__tests__/`:

- `<name>.service.test.ts` — Unit test skeleton with describe/it blocks
- `<name>.api.test.ts` — Integration test skeleton with HTTP tests

## Step 2: Customize

1. Read `CLAUDE.md` for project conventions.
2. Read existing test files to follow the established patterns, naming, and structure.
3. Read the relevant plan:
   - `docs/plans/01-database-plan.md` for migration/schema tests
   - `docs/plans/03-backend-plan.md` for API/service tests
4. Read the source code being tested (if it exists) to understand the implementation.
5. Fill in TODO sections: assertions, mocks, test data, and domain-specific scenarios.

## Test Framework

- **Framework**: Vitest (preferred) or Jest
- **Assertion style**: `expect()` with descriptive matchers
- **Structure**: `describe` → `it` blocks with clear naming

## What to Generate

### Unit Tests

For each service/function, generate tests covering:

1. **Happy path** — Normal operation with valid inputs
2. **Validation failures** — Invalid/missing required fields
3. **Tenant isolation** — Ensure cross-tenant data is never accessible
4. **Edge cases** — Empty arrays, zero values, null optionals, boundary values
5. **Business logic** — Domain-specific rules (wager types, wage formulas, GST logic)
6. **Error handling** — Database errors, not found, duplicate entries

```typescript
// Naming convention
describe("ServiceName", () => {
  describe("methodName", () => {
    it("should [expected behavior] when [condition]", () => {});
  });
});
```

### Integration Tests

For API endpoint tests, generate:

1. **Request/response cycle** — Full HTTP request to response
2. **Authentication** — Reject unauthenticated requests (401)
3. **Authorization** — Reject unauthorized roles (403)
4. **Tenant isolation** — Tenant A cannot see Tenant B's data
5. **Validation** — Reject malformed request body (400)
6. **Database state** — Verify DB state after mutations
7. **Transaction rollback** — Verify no partial writes on failure

```typescript
// Integration test naming
describe("POST /api/module", () => {
  it("should create a record and return 201", () => {});
  it("should return 401 without auth token", () => {});
  it("should return 403 for unauthorized role", () => {});
  it("should not expose other tenant data", () => {});
});
```

## Test Utilities (use or create if missing)

```typescript
// Expected test helpers
createTestTenant(); // Creates an isolated test tenant
createTestUser(tenantId, role); // Creates user with specific role
getAuthToken(userId); // Generates JWT for test requests
createTestProduct(tenantId); // Creates sample product with defaults
resetDatabase(); // Clean slate between tests
```

## Domain-Specific Test Patterns

### Wager Type Tests

- Test all 4 types separately (Type 1: weight+kg, Type 2: count+piece, Type 3: weight+kg, Type 4: count+piece)
- Verify return basis (weight mandatory vs count mandatory)
- Verify wage basis (per kg vs per piece)

### Wage Calculation Tests

```
Gross Wage - Advance Deduction - Damage Deduction = Net Payable
```

- Test zero net payable scenario
- Test negative net payable with discretionary payment
- Test advance balance carry-forward

### Inventory Stage Tests

- Test each transition: Raw → Paavu → Woven → Tailored → Bundled → Sold
- Test invalid transitions are rejected
- Test stock dimensions: godown + product + color + stage + batch

### Batch System Tests

- Test with batch mode ON (all operations link to batch)
- Test with batch mode OFF (batch fields hidden/null)
- Test batch reopen after close

### GST Tests

- Test intra-state (same state code → CGST + SGST)
- Test inter-state (different state codes → IGST)
- Test GST rate from product config

### RLS Tests

- Test that `SET app.current_tenant_id` scopes all queries
- Test that queries without tenant context return nothing
- Test that JOINs don't cross tenant boundaries

## Output

After generating, list:

1. All test files created with their paths
2. Total test count (unit + integration)
3. Coverage areas vs plan requirements
4. Any test utilities that were created
5. Suggested order to run tests (dependencies)
