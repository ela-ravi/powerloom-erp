# Financial Phases — Powerloom ERP V3

> Phases 8–9: Wage & Advance + Sales & Finance
>
> Back to [Implementation Guide](./06-implementation-guide.md) | Prev: [Core Phases](./06b-core-phases.md) | Next: [Platform Phases](./06d-platform-phases.md)

---

## Phase 8: Wage & Advance

> **Dependencies:** Phase 5 (Production), Phase 6 (Damage), Phase 7 (Post-Production)
> **Epics:** DB Epic 8 + BE Epic 10
> **CL-DB:** 13.1–13.12 (12 items) | **CL-BE:** 10.1–10.18 (18 items)
> **Endpoints:** 10 | **Unit Tests:** ~40 | **Integration Tests:** IT-10.1–IT-10.7
> **MILESTONE PHASE** — `devils-advocate` review required

### Overview

The wage and advance system is the most business-logic-intensive module. It calculates wages for 4 worker types (wager, tailor, packager, paavu oati), manages advance issuances with running balances, handles damage deductions with owner-approved amounts, and supports discretionary payments when net payable is zero or negative.

**Wage Formula:**

```
Gross Wage (production-based per worker type)
- Advance Deduction (configurable amount per cycle)
- Damage Deduction (sum of approved damages for the week)
= Net Payable
```

If net payable <= 0, owner CAN still pay a discretionary amount, which gets added to the advance balance.

### DB Tables

**`advance_transactions`**

| Column          | Type            | Notes                                                          |
| --------------- | --------------- | -------------------------------------------------------------- |
| `id`            | `uuid`          | PK                                                             |
| `tenant_id`     | `uuid`          | FK → tenants                                                   |
| `wager_id`      | `uuid`          | FK → wager_profiles                                            |
| `type`          | `enum`          | `advance_given`, `advance_deduction`, `discretionary_addition` |
| `amount`        | `decimal(12,2)` | Transaction amount                                             |
| `balance_after` | `decimal(12,2)` | Running balance snapshot                                       |
| `reference_id`  | `uuid`          | Nullable — links to wage_record if deduction                   |
| `notes`         | `text`          | Optional                                                       |
| `created_at`    | `timestamptz`   |                                                                |

**`wage_cycles`**

| Column             | Type          | Notes                                 |
| ------------------ | ------------- | ------------------------------------- |
| `id`               | `uuid`        | PK                                    |
| `tenant_id`        | `uuid`        | FK → tenants                          |
| `cycle_number`     | `integer`     | Auto-generated per tenant             |
| `cycle_start_date` | `date`        | Start of week                         |
| `cycle_end_date`   | `date`        | End of week                           |
| `status`           | `enum`        | `draft`, `review`, `approved`, `paid` |
| `created_at`       | `timestamptz` |                                       |
| `updated_at`       | `timestamptz` |                                       |

**`wage_records`**

| Column                 | Type            | Notes                                       |
| ---------------------- | --------------- | ------------------------------------------- |
| `id`                   | `uuid`          | PK                                          |
| `tenant_id`            | `uuid`          | FK → tenants                                |
| `wage_cycle_id`        | `uuid`          | FK → wage_cycles                            |
| `worker_id`            | `uuid`          | FK → users                                  |
| `worker_type`          | `enum`          | `wager`, `tailor`, `packager`, `paavu_oati` |
| `gross_wage`           | `decimal(12,2)` | Production-based calculation                |
| `advance_deduction`    | `decimal(12,2)` | Configurable amount                         |
| `damage_deduction`     | `decimal(12,2)` | Sum of approved damages                     |
| `net_payable`          | `decimal(12,2)` | gross - advance - damage                    |
| `discretionary_amount` | `decimal(12,2)` | Owner can set when net <= 0                 |
| `actual_paid`          | `decimal(12,2)` | Final amount paid                           |
| `created_at`           | `timestamptz`   |                                             |
| `updated_at`           | `timestamptz`   |                                             |

### Skills to Invoke

| Order | Command                                                                           | Purpose                          |
| ----- | --------------------------------------------------------------------------------- | -------------------------------- |
| 1     | `/generate-test advances unit`                                                    | RED: Advance issuance tests      |
| 2     | `/generate-test wage-cycles unit`                                                 | RED: Wage calculation tests      |
| 3     | `/db-migration advance_transactions`                                              | GREEN: Create advance table      |
| 4     | `/db-migration wage_cycles`                                                       | GREEN: Create wage cycles table  |
| 5     | `/db-migration wage_records`                                                      | GREEN: Create wage records table |
| 6     | `/generate-seed advance_transactions`                                             | GREEN: Seed test data            |
| 7     | `/scaffold-module advances`                                                       | GREEN: Advance endpoints         |
| 8     | `/scaffold-module wage-cycles`                                                    | GREEN: Wage cycle endpoints      |
| 9     | `/api-endpoint GET /api/wagers/me/wages`                                          | GREEN: Wager self-service view   |
| 10    | `/generate-test wage-cycles integration`                                          | Integration tests                |
| 11    | `/add-translation wages.gross "Gross Wage" "மொத்த ஊதியம்"`                        | i18n                             |
| 12    | `/add-translation wages.net "Net Payable" "நிகர செலுத்த வேண்டியது"`               | i18n                             |
| 13    | `/add-translation wages.advance_deduction "Advance Deduction" "முன்பணம் கழிப்பு"` | i18n                             |

### Agent Activation Flow

**Proactive (automatic):**

- `db-reviewer` — on migration creation (3 tables)
- `business-logic-validator` — on WageCycleService implementation (CRITICAL: validates wage formula)
- `test-runner` — after each implementation step

**Manual (invoke explicitly):**

- `domain-expert` — clarify wage calculation rules per wager type, discretionary payment logic
- `checklist-validator` — verify CL-DB-13 and CL-BE-10 coverage
- `devils-advocate` — **REQUIRED at this milestone**: stress-test wage calculations, negative balances, concurrent cycles

### TDD Steps

#### RED — Write Failing Tests

```bash
# Advance tests
/generate-test advances unit
# Tests to write:
# - Issue advance → 201, wager_profile.advance_balance increases
# - balance_after snapshot correct
# - original_advance updated on first advance
# - Transaction history returns chronological list
# - Wager can view own advance balance

# Wage cycle tests
/generate-test wage-cycles unit
# Tests to write:
# - Generate cycle → wage_records for all active workers
# - Wager gross: Type 1/3 → sum(production_returns.return_weight_kg * product.wage_rate_per_kg)
# - Wager gross: Type 2/4 → sum(production_returns.return_count * product.wage_rate_per_piece)
# - Shift rates override default when shift_enabled
# - Tailor gross → sum(tailoring_records.total_wage)
# - Packager gross → sum(packaging_records.total_wage)
# - Paavu Oati gross → sum(paavu_productions.paavu_count * rate)
# - advance_deduction applied (configurable per cycle)
# - damage_deduction = sum(approved damages for the week)
# - net_payable = gross - advance - damage
# - Status workflow: draft → review → approved → paid
# - Invalid transition → 400
# - Discretionary: when net <= 0, owner sets discretionary_amount
# - Discretionary → advance_transaction created (type=discretionary_addition)
# - Wager self-service: sees own wages only
```

#### GREEN — Implement

```bash
# 1. Create migrations
/db-migration advance_transactions
/db-migration wage_cycles
/db-migration wage_records

# 2. Scaffold modules
/scaffold-module advances
/scaffold-module wage-cycles

# 3. Implement WageCycleService.generate() — the core logic:
#    For each active worker in tenant:
#      - Query production_returns in date range → calculate gross
#      - Query approved damage_records in date range → calculate damage deduction
#      - Get advance_deduction from tenant settings
#      - Calculate net_payable
#      - Create wage_record

# 4. Self-service endpoint
/api-endpoint GET /api/wagers/me/wages
```

#### REFACTOR

- Extract wage calculation per worker type into separate functions
- Create shared `calculateGrossWage(workerType, records, product)` utility
- Ensure all monetary calculations use `decimal` not `float`
- Add i18n keys for all wage-related strings

### Endpoints

| Method | Path                              | Auth                     | Purpose                         |
| ------ | --------------------------------- | ------------------------ | ------------------------------- |
| `POST` | `/api/advances`                   | Owner, Staff(wages)      | Issue advance to wager          |
| `GET`  | `/api/advances`                   | Owner, Staff(wages)      | List advance transactions       |
| `GET`  | `/api/wagers/:id/advance-balance` | Owner, Staff, Wager(own) | Get current balance             |
| `POST` | `/api/wage-cycles/generate`       | Owner                    | Auto-generate current cycle     |
| `GET`  | `/api/wage-cycles`                | Owner, Staff(wages)      | List cycles                     |
| `GET`  | `/api/wage-cycles/:id`            | Owner, Staff(wages)      | Get cycle with all wage records |
| `PUT`  | `/api/wage-cycles/:id/review`     | Owner                    | Move to review status           |
| `PUT`  | `/api/wage-cycles/:id/approve`    | Owner                    | Approve cycle                   |
| `PUT`  | `/api/wage-cycles/:id/pay`        | Owner                    | Mark as paid                    |
| `GET`  | `/api/wagers/me/wages`            | Wager                    | Self-service wage history       |

### Curl Commands

See [06e-curl-reference.md — Advances](./06e-curl-reference.md#advances) and [Wage Cycles](./06e-curl-reference.md#wage-cycles).

### Integration Tests

| ID      | Test                                                                       | What It Validates     |
| ------- | -------------------------------------------------------------------------- | --------------------- |
| IT-10.1 | Issue advance → generate wage cycle → advance deducted → balance decreases | Advance integration   |
| IT-10.2 | Full cycle: production + damage + advance → verify net_payable formula     | Complete wage formula |
| IT-10.3 | Negative net → discretionary pay → advance balance increases               | Discretionary flow    |
| IT-10.4 | Multi-worker-type cycle: wager + tailor + packager + paavu_oati            | All 4 worker types    |
| IT-10.5 | Shift-based wage rates applied correctly                                   | Shift feature flag    |
| IT-10.6 | Status workflow: draft → review → approved → paid                          | State machine         |
| IT-10.7 | Wager self-service view shows correct data                                 | RLS / scoping         |

### Verification Gate

- [ ] All unit tests pass (~40 tests)
- [ ] All integration tests pass (IT-10.1 through IT-10.7)
- [ ] Curl manual testing done for all 10 endpoints
- [ ] `db-reviewer` approved all 3 migrations
- [ ] `business-logic-validator` approved wage calculation logic
- [ ] `checklist-validator` confirmed CL-DB-13 (12/12) + CL-BE-10 (18/18)
- [ ] `devils-advocate` stress-tested: negative balances, concurrent cycles, zero production, rounding
- [ ] Wage formula matches spec exactly: gross - advance_deduction - damage_deduction = net_payable
- [ ] All 4 worker types produce correct wages
- [ ] Discretionary payment correctly adds to advance balance
- [ ] i18n keys added for all wage-related strings

---

## Phase 9: Sales & Finance

> **Dependencies:** Phase 2 (Master Data), Phase 4 (Inventory)
> **Epics:** DB Epic 9 + BE Epic 11
> **CL-DB:** 14.1–14.15 (15 items) | **CL-BE:** 11.1–11.15 (15 items)
> **Endpoints:** 10 | **Unit Tests:** ~35 | **Integration Tests:** IT-11.1–IT-11.6
> **MILESTONE PHASE** — `devils-advocate` review required

### Overview

The sales and finance module handles GST-compliant invoicing with automatic tax detection (intra-state CGST+SGST vs inter-state IGST), payment recording with partial and bill-to-bill customer type enforcement, credit period management, overdue detection, and e-way bill export.

**GST Logic:**

```
If tenant.state_code == customer.state_code:
  → Intra-state: CGST = SGST = subtotal * (gst_rate / 2 / 100)
Else:
  → Inter-state: IGST = subtotal * (gst_rate / 100)
```

### DB Tables

**`invoices`**

| Column             | Type            | Notes                                                               |
| ------------------ | --------------- | ------------------------------------------------------------------- |
| `id`               | `uuid`          | PK                                                                  |
| `tenant_id`        | `uuid`          | FK → tenants                                                        |
| `invoice_number`   | `varchar(50)`   | Auto-generated, unique per tenant                                   |
| `customer_id`      | `uuid`          | FK → customers                                                      |
| `invoice_date`     | `date`          |                                                                     |
| `due_date`         | `date`          | invoice_date + customer.credit_period_days                          |
| `tax_type`         | `enum`          | `intra_state`, `inter_state`                                        |
| `subtotal`         | `decimal(12,2)` | Sum of line totals                                                  |
| `cgst_amount`      | `decimal(12,2)` | Intra-state only                                                    |
| `sgst_amount`      | `decimal(12,2)` | Intra-state only                                                    |
| `igst_amount`      | `decimal(12,2)` | Inter-state only                                                    |
| `total_amount`     | `decimal(12,2)` | subtotal + tax                                                      |
| `amount_paid`      | `decimal(12,2)` | Default 0                                                           |
| `balance_due`      | `decimal(12,2)` | total_amount - amount_paid                                          |
| `status`           | `enum`          | `draft`, `issued`, `partially_paid`, `paid`, `overdue`, `cancelled` |
| `eway_bill_number` | `varchar(50)`   | Optional                                                            |
| `batch_id`         | `uuid`          | Nullable FK → batches                                               |
| `created_at`       | `timestamptz`   |                                                                     |
| `updated_at`       | `timestamptz`   |                                                                     |

**`invoice_items`**

| Column         | Type            | Notes                                |
| -------------- | --------------- | ------------------------------------ |
| `id`           | `uuid`          | PK                                   |
| `tenant_id`    | `uuid`          | FK → tenants                         |
| `invoice_id`   | `uuid`          | FK → invoices                        |
| `product_id`   | `uuid`          | FK → products                        |
| `color`        | `varchar(50)`   |                                      |
| `quantity`     | `integer`       |                                      |
| `unit_price`   | `decimal(10,2)` | From product or product_color_prices |
| `line_total`   | `decimal(12,2)` | quantity \* unit_price               |
| `gst_rate_pct` | `decimal(5,2)`  | Snapshot from product at creation    |
| `hsn_code`     | `varchar(20)`   | Snapshot from product                |
| `batch_id`     | `uuid`          | Nullable                             |
| `created_at`   | `timestamptz`   |                                      |

**`payments`**

| Column             | Type            | Notes                                             |
| ------------------ | --------------- | ------------------------------------------------- |
| `id`               | `uuid`          | PK                                                |
| `tenant_id`        | `uuid`          | FK → tenants                                      |
| `invoice_id`       | `uuid`          | FK → invoices                                     |
| `customer_id`      | `uuid`          | FK → customers                                    |
| `amount`           | `decimal(12,2)` | Payment amount                                    |
| `payment_method`   | `enum`          | `cash`, `upi`, `bank_transfer`, `cheque`, `other` |
| `payment_date`     | `date`          |                                                   |
| `reference_number` | `varchar(100)`  | Optional (cheque #, UTR, etc.)                    |
| `notes`            | `text`          | Optional                                          |
| `created_at`       | `timestamptz`   |                                                   |

### Skills to Invoke

| Order | Command                                                    | Purpose                           |
| ----- | ---------------------------------------------------------- | --------------------------------- |
| 1     | `/generate-test invoices unit`                             | RED: Invoice creation + GST tests |
| 2     | `/generate-test payments unit`                             | RED: Payment + balance tests      |
| 3     | `/db-migration invoices`                                   | GREEN: Create invoices table      |
| 4     | `/db-migration invoice_items`                              | GREEN: Create items table         |
| 5     | `/db-migration payments`                                   | GREEN: Create payments table      |
| 6     | `/generate-seed invoices`                                  | GREEN: Seed test data             |
| 7     | `/scaffold-module invoices`                                | GREEN: Invoice endpoints          |
| 8     | `/scaffold-module payments`                                | GREEN: Payment endpoints          |
| 9     | `/api-endpoint GET /api/invoices/:id/eway-bill`            | GREEN: E-way bill export          |
| 10    | `/api-endpoint GET /api/reports/customer-aging`            | GREEN: Aging report               |
| 11    | `/generate-test invoices integration`                      | Integration tests                 |
| 12    | `/add-translation invoice.subtotal "Subtotal" "உட்கூட்டு"` | i18n                              |
| 13    | `/add-translation invoice.cgst "CGST" "மத்திய GST"`        | i18n                              |
| 14    | `/add-translation invoice.sgst "SGST" "மாநில GST"`         | i18n                              |
| 15    | `/add-translation invoice.igst "IGST" "ஒருங்கிணைந்த GST"`  | i18n                              |

### Agent Activation Flow

**Proactive (automatic):**

- `db-reviewer` — on migration creation (3 tables)
- `business-logic-validator` — on InvoiceService (CRITICAL: validates GST calculation, payment logic)
- `test-runner` — after each implementation step

**Manual (invoke explicitly):**

- `domain-expert` — clarify GST rules, customer types (partial vs bill-to-bill), e-way bill format
- `checklist-validator` — verify CL-DB-14 and CL-BE-11 coverage
- `devils-advocate` — **REQUIRED at this milestone**: stress-test GST rounding, partial payments, overdue edge cases

### TDD Steps

#### RED — Write Failing Tests

```bash
/generate-test invoices unit
# Tests to write:
# - Create invoice → 201, auto-generated invoice_number
# - tax_type auto-detected from state codes
# - Intra-state: cgst = sgst = subtotal * (gst_rate / 2 / 100)
# - Inter-state: igst = subtotal * (gst_rate / 100)
# - due_date = invoice_date + customer.credit_period_days
# - subtotal = sum(line_totals), total = subtotal + tax
# - line_total = quantity * unit_price
# - Color pricing Mode 1 → average price
# - Color pricing Mode 2 → per-color price from product_color_prices
# - gst_rate_pct snapshot from product at creation
# - Inventory moves to 'sold' stage on issue
# - customer.outstanding_balance increases on issue
# - Invoice status transitions: draft → issued → partially_paid → paid
# - Cancel invoice reverses outstanding balance

/generate-test payments unit
# Tests to write:
# - Partial payment → amount_paid updated, balance_due decreased
# - Full payment → status = 'paid'
# - Payment > balance_due → 400
# - customer.outstanding_balance decreases
# - payment_method enum validation
# - wholesale_partial can make partial payments
# - wholesale_bill_to_bill must pay full invoice → 400 on partial
# - Customer statement shows invoices + payments chronologically
```

#### GREEN — Implement

```bash
# 1. Create migrations
/db-migration invoices
/db-migration invoice_items
/db-migration payments

# 2. Scaffold modules
/scaffold-module invoices
/scaffold-module payments

# 3. Implement InvoiceService:
#    - Auto-detect tax type from tenant.state_code vs customer.state_code
#    - Calculate CGST/SGST or IGST
#    - Auto-generate invoice_number per tenant
#    - On issue: update inventory stage to 'sold', update customer.outstanding_balance

# 4. Implement PaymentService:
#    - Validate payment amount <= balance_due
#    - Update invoice.amount_paid, balance_due
#    - Update customer.outstanding_balance
#    - Enforce bill-to-bill full payment

# 5. Additional endpoints
/api-endpoint GET /api/invoices/:id/eway-bill
/api-endpoint GET /api/reports/customer-aging
```

#### REFACTOR

- Extract GST calculation into `calculateGST(tenantStateCode, customerStateCode, subtotal, gstRate)` utility
- Extract invoice number generation into `generateInvoiceNumber(tenantId)` utility
- Ensure all monetary calculations use `decimal` precision
- Add i18n keys for all invoice/payment strings

### Endpoints

| Method | Path                           | Auth                | Purpose                    |
| ------ | ------------------------------ | ------------------- | -------------------------- |
| `POST` | `/api/invoices`                | Owner, Staff(sales) | Create invoice with items  |
| `GET`  | `/api/invoices`                | Owner, Staff(sales) | List invoices (filterable) |
| `GET`  | `/api/invoices/:id`            | Owner, Staff(sales) | Get invoice with items     |
| `PUT`  | `/api/invoices/:id`            | Owner, Staff(sales) | Update draft invoice       |
| `PUT`  | `/api/invoices/:id/issue`      | Owner               | Issue invoice              |
| `PUT`  | `/api/invoices/:id/cancel`     | Owner               | Cancel invoice             |
| `GET`  | `/api/invoices/:id/eway-bill`  | Owner, Staff(sales) | E-way bill JSON export     |
| `POST` | `/api/payments`                | Owner, Staff(sales) | Record payment             |
| `GET`  | `/api/payments`                | Owner, Staff(sales) | List payments              |
| `GET`  | `/api/customers/:id/statement` | Owner, Staff(sales) | Customer account statement |

### Curl Commands

See [06e-curl-reference.md — Invoices](./06e-curl-reference.md#invoices) and [Payments](./06e-curl-reference.md#payments).

### Integration Tests

| ID      | Test                                                                            | What It Validates         |
| ------- | ------------------------------------------------------------------------------- | ------------------------- |
| IT-11.1 | Create invoice → auto-detect GST → verify tax split → issue → inventory to sold | Full invoice flow         |
| IT-11.2 | Partial payment → verify balance → full payment → status=paid                   | Payment lifecycle         |
| IT-11.3 | Invoice past due → overdue detected → notification created                      | Overdue detection         |
| IT-11.4 | Customer statement → correct chronological view                                 | Statement generation      |
| IT-11.5 | Aging report → correct bucket distribution (0-30/30-60/60-90/90+)               | Aging calculation         |
| IT-11.6 | Bill-to-bill customer → partial payment rejected                                | Customer type enforcement |

### Verification Gate

- [ ] All unit tests pass (~35 tests)
- [ ] All integration tests pass (IT-11.1 through IT-11.6)
- [ ] Curl manual testing done for all 10 endpoints
- [ ] `db-reviewer` approved all 3 migrations
- [ ] `business-logic-validator` approved GST calculation + payment logic
- [ ] `checklist-validator` confirmed CL-DB-14 (15/15) + CL-BE-11 (15/15)
- [ ] `devils-advocate` stress-tested: GST rounding, zero-value invoices, partial vs bill-to-bill, cancelled invoice payments
- [ ] GST calculation matches spec: intra-state CGST+SGST, inter-state IGST
- [ ] Invoice number generation is unique per tenant
- [ ] Customer outstanding_balance is always consistent with invoice/payment state
- [ ] E-way bill JSON export returns valid format
- [ ] i18n keys added for all finance-related strings
