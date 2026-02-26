---
name: generate-seed
description: Generate tenant-aware seed data for testing and development
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: [table-name or "all"]
---

Generate seed data for `$ARGUMENTS` with proper tenant isolation and foreign key relationships.

## Step 1: Generate Template

Run the template generator:

```bash
pnpm gen:seed $0
```

For a single table, this creates `src/db/seeds/<table_name>.seed.ts` with:

- 2-tenant structure (TENANT_1, TENANT_2) for isolation testing
- FK dependency comments
- TODO placeholders for realistic domain data

For `all`, this creates `src/db/seeds/index.seed.ts` — a master runner calling seeds in FK order.

## Step 2: Customize

1. Read `CLAUDE.md` for database conventions and domain terminology.
2. Read `docs/plans/01-database-plan.md` for table schemas and relationships.
3. Read existing seed files to follow established patterns.
4. Read existing migrations to understand column types, constraints, and ENUMs.
5. Fill in TODO sections with realistic domain data (see below).

## Seed Data Rules

### Tenant Isolation

- ALWAYS create at least **2 test tenants** to verify isolation
- Every record MUST have a `tenant_id` matching one of the test tenants
- NEVER create records that reference entities from a different tenant

### Foreign Key Order

Generate seed data in dependency order:

```
1. tenants → tenant_settings
2. users → staff_permissions, otp_codes
3. loom_types → looms
4. products → product_color_prices
5. suppliers, customers, godowns
6. wager_profiles
7. batches (if batch mode ON)
8. cone_purchases → inventory → inventory_movements
9. cone_issuances → paavu_productions → production_returns
10. damage_records
11. tailoring_records → packaging_records
12. advance_transactions → wage_cycles → wage_records
13. invoices → invoice_items → payments
14. notifications, fraud_alerts
```

### Realistic Domain Data

Use realistic powerloom industry data:

**Products:**

- "30x60 White Khadi", "36x72 Colored Jakkadu", "Khadi Premium"
- Colors: White (வெள்ளை), Blue (நீலம்), Green (பச்சை), Red (சிவப்பு), Yellow (மஞ்சள்)
- GST rates: 5%, 12%

**Cone Types:**

- 20s Count Cotton, 40s Count Cotton, 60s Count Cotton
- Standard bale: ~60kg

**Wager Names (Tamil Nadu style):**

- Murugan K, Senthil P, Ramasamy V, Lakshmi R, Ganesan M

**Godowns:**

- "Main Godown", "Raw Material Store", "Finished Goods Warehouse"

**Suppliers:**

- "Sri Lakshmi Cotton Traders", "KPR Mill Stores", "Coimbatore Yarn Supplies"

**Customers:**

- "Madurai Textile Mart", "Chennai Textile House", "Erode Wholesale Traders"
- Mix of partial-payment and bill-to-bill types
- Mix of same-state (Tamil Nadu) and other states for GST testing

### Data Scenarios

Generate data covering these scenarios:

1. **Happy path** — Complete production cycle: cone → paavu → woven → tailored → bundled → sold
2. **All 4 wager types** — At least one wager per type with appropriate return/wage data
3. **Batch ON vs OFF** — Tenant 1 with batching enabled, Tenant 2 without
4. **Damage scenarios** — Minor, Major, Reject grades + unidentifiable (Miscellaneous)
5. **Wage scenarios** — Normal payout, zero net payable, negative with discretionary payment
6. **Credit scenarios** — Current, approaching due, overdue customers
7. **GST scenarios** — Intra-state (TN→TN) and inter-state (TN→KA) invoices
8. **Inventory across godowns** — Stock in multiple godowns at different stages
9. **Shift data** — If shift tracking enabled (Tenant 1: Day/Night shifts)
10. **Inter-godown transfer** — At least one transfer between godowns

## Output Format

Generate seed data as:

### SQL Format (for migrations)

```sql
-- Seed: tenants
INSERT INTO tenants (id, tenant_id, name, ...) VALUES
  ('uuid-1', 'uuid-1', 'Test Mill 1', ...),
  ('uuid-2', 'uuid-2', 'Test Mill 2', ...);
```

### TypeScript Format (for test fixtures)

```typescript
export const testTenants = {
  mill1: { id: "uuid-1", name: "Sri Murugan Powerloom" },
  mill2: { id: "uuid-2", name: "Lakshmi Textiles" },
};
```

## After Generation

Report:

1. All seed files created with paths
2. Total record count per table
3. Which test scenarios each seed record covers
4. FK dependency order for insertion
5. Cleanup/teardown order (reverse of insertion)
