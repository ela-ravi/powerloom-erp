# Checklist Matrix — Powerloom ERP V3

> Maps every CL-DB and CL-BE item to its implementation phase, responsible teammate, skill to invoke, and completion status.

---

## How to Use

1. Filter by **Phase** to see what's needed for your current phase
2. Filter by **Teammate** to see your assigned items
3. Update **Status** as items are completed: `[ ]` → `[x]`
4. Run `checklist-validator` agent to auto-verify status against codebase

### Status Legend

| Symbol | Meaning               |
| ------ | --------------------- |
| `[ ]`  | Not started           |
| `[~]`  | In progress / partial |
| `[x]`  | Complete              |
| `[B]`  | Blocked               |

---

## CL-DB: Database Checklist (148 Items)

### CL-DB-01: Tenant Management (11 items)

| #    | Check Item                                        | Phase | Teammate | Skill                           | Status |
| ---- | ------------------------------------------------- | ----- | -------- | ------------------------------- | ------ |
| 1.1  | Tenant CRUD operations                            | 1     | TM1      | `/db-migration tenants`         | [ ]    |
| 1.2  | Tenant status management (active/suspended/trial) | 1     | TM1      | `/db-migration tenants`         | [ ]    |
| 1.3  | Tenant settings CRUD                              | 1     | TM1      | `/db-migration tenant_settings` | [ ]    |
| 1.4  | Batch mode toggle                                 | 1     | TM1      | `/db-migration tenant_settings` | [ ]    |
| 1.5  | Shift mode toggle                                 | 1     | TM1      | `/db-migration tenant_settings` | [ ]    |
| 1.6  | Inter-godown transfer toggle                      | 1     | TM1      | `/db-migration tenant_settings` | [ ]    |
| 1.7  | Auth method config (OTP/PIN)                      | 1     | TM1      | `/db-migration tenant_settings` | [ ]    |
| 1.8  | Wage cycle day config                             | 1     | TM1      | `/db-migration tenant_settings` | [ ]    |
| 1.9  | Damage deduction rates                            | 1     | TM1      | `/db-migration tenant_settings` | [ ]    |
| 1.10 | Wager ranking visibility                          | 1     | TM1      | `/db-migration tenant_settings` | [ ]    |
| 1.11 | GST state detection                               | 1     | TM1      | `/db-migration tenants`         | [ ]    |

### CL-DB-02: Authentication & Users (10 items)

| #    | Check Item                        | Phase | Teammate | Skill                             | Status |
| ---- | --------------------------------- | ----- | -------- | --------------------------------- | ------ |
| 2.1  | Phone OTP login flow              | 1     | TM1      | `/db-migration otp_codes`         | [ ]    |
| 2.2  | PIN login flow                    | 1     | TM1      | `/db-migration users`             | [ ]    |
| 2.3  | User CRUD (per tenant)            | 1     | TM1      | `/db-migration users`             | [ ]    |
| 2.4  | Role-based routing                | 1     | TM1      | `/db-migration users`             | [ ]    |
| 2.5  | Staff permission assignment       | 1     | TM1      | `/db-migration staff_permissions` | [ ]    |
| 2.6  | Staff permission enforcement      | 1     | TM1      | `/db-migration staff_permissions` | [ ]    |
| 2.7  | User language preference          | 1     | TM1      | `/db-migration users`             | [ ]    |
| 2.8  | User active/inactive toggle       | 1     | TM1      | `/db-migration users`             | [ ]    |
| 2.9  | Composite unique phone per tenant | 1     | TM1      | `/db-migration users`             | [ ]    |
| 2.10 | Super Admin cross-tenant access   | 1     | TM1      | `/db-migration users`             | [ ]    |

### CL-DB-03: Loom Management (6 items)

| #   | Check Item              | Phase | Teammate | Skill                      | Status |
| --- | ----------------------- | ----- | -------- | -------------------------- | ------ |
| 3.1 | Loom type CRUD          | 2     | TM1      | `/db-migration loom_types` | [ ]    |
| 3.2 | Capacity per loom type  | 2     | TM1      | `/db-migration loom_types` | [ ]    |
| 3.3 | Individual loom CRUD    | 2     | TM1      | `/db-migration looms`      | [ ]    |
| 3.4 | Loom-wager assignment   | 2     | TM1      | `/db-migration looms`      | [ ]    |
| 3.5 | Loom ownership tracking | 2     | TM1      | `/db-migration looms`      | [ ]    |
| 3.6 | Maintenance status      | 2     | TM1      | `/db-migration looms`      | [ ]    |

### CL-DB-04: Product Master (11 items)

| #    | Check Item                                   | Phase | Teammate | Skill                                | Status |
| ---- | -------------------------------------------- | ----- | -------- | ------------------------------------ | ------ |
| 4.1  | Product CRUD                                 | 2     | TM1      | `/db-migration products`             | [ ]    |
| 4.2  | Paavu/Oodai consumption config               | 2     | TM1      | `/db-migration products`             | [ ]    |
| 4.3  | Wage rates (per kg & per piece)              | 2     | TM1      | `/db-migration products`             | [ ]    |
| 4.4  | Stitch & knot rates                          | 2     | TM1      | `/db-migration products`             | [ ]    |
| 4.5  | Bundle config & rates                        | 2     | TM1      | `/db-migration products`             | [ ]    |
| 4.6  | GST rate per product                         | 2     | TM1      | `/db-migration products`             | [ ]    |
| 4.7  | Color pricing Mode 1 (average)               | 2     | TM1      | `/db-migration products`             | [ ]    |
| 4.8  | Color pricing Mode 2 (per-color)             | 2     | TM1      | `/db-migration product_color_prices` | [ ]    |
| 4.9  | Shift-wise wage rates                        | 2     | TM1      | `/db-migration shift_wage_rates`     | [ ]    |
| 4.10 | Product category (single/double/triple/quad) | 2     | TM1      | `/db-migration products`             | [ ]    |
| 4.11 | HSN code for GST                             | 2     | TM1      | `/db-migration products`             | [ ]    |

### CL-DB-05: Suppliers & Customers (6 items)

| #   | Check Item                   | Phase | Teammate | Skill                     | Status |
| --- | ---------------------------- | ----- | -------- | ------------------------- | ------ |
| 5.1 | Supplier CRUD                | 2     | TM1      | `/db-migration suppliers` | [ ]    |
| 5.2 | Customer CRUD                | 2     | TM1      | `/db-migration customers` | [ ]    |
| 5.3 | Customer type selection      | 2     | TM1      | `/db-migration customers` | [ ]    |
| 5.4 | Credit period per customer   | 2     | TM1      | `/db-migration customers` | [ ]    |
| 5.5 | Outstanding balance tracking | 2     | TM1      | `/db-migration customers` | [ ]    |
| 5.6 | Customer state code for GST  | 2     | TM1      | `/db-migration customers` | [ ]    |

### CL-DB-06: Godowns (4 items)

| #   | Check Item                   | Phase | Teammate | Skill                   | Status |
| --- | ---------------------------- | ----- | -------- | ----------------------- | ------ |
| 6.1 | Godown CRUD                  | 2     | TM1      | `/db-migration godowns` | [ ]    |
| 6.2 | Main godown designation      | 2     | TM1      | `/db-migration godowns` | [ ]    |
| 6.3 | Paavu Pattarai type          | 2     | TM1      | `/db-migration godowns` | [ ]    |
| 6.4 | Godown dropdown in all forms | 2     | TM1      | `/db-migration godowns` | [ ]    |

### CL-DB-07: Wager Profiles (5 items)

| #   | Check Item                                | Phase | Teammate | Skill                          | Status |
| --- | ----------------------------------------- | ----- | -------- | ------------------------------ | ------ |
| 7.1 | Wager profile CRUD                        | 2     | TM1      | `/db-migration wager_profiles` | [ ]    |
| 7.2 | Wager type (1-4)                          | 2     | TM1      | `/db-migration wager_profiles` | [ ]    |
| 7.3 | Advance balance display                   | 2     | TM1      | `/db-migration wager_profiles` | [ ]    |
| 7.4 | Original vs additional advance separation | 2     | TM1      | `/db-migration wager_profiles` | [ ]    |
| 7.5 | Wager-user 1:1 link                       | 2     | TM1      | `/db-migration wager_profiles` | [ ]    |

### CL-DB-08: Batch System (5 items)

| #   | Check Item                              | Phase | Teammate | Skill                                                | Status |
| --- | --------------------------------------- | ----- | -------- | ---------------------------------------------------- | ------ |
| 8.1 | Batch CRUD (conditional)                | 3     | TM1      | `/db-migration batches`                              | [ ]    |
| 8.2 | Batch status transitions                | 3     | TM1      | `/db-migration batches`                              | [ ]    |
| 8.3 | Batch reopen capability                 | 3     | TM1      | `/db-migration batches`                              | [ ]    |
| 8.4 | Batch_id nullable in all related tables | 3     | TM1      | `/db-migration batches`                              | [ ]    |
| 8.5 | Batch profitability data                | 11    | TM3      | `/api-endpoint GET /api/reports/batch-profitability` | [ ]    |

### CL-DB-09: Inventory System (9 items)

| #   | Check Item                           | Phase | Teammate | Skill                                             | Status |
| --- | ------------------------------------ | ----- | -------- | ------------------------------------------------- | ------ |
| 9.1 | Cone purchase recording              | 4     | TM1      | `/db-migration cone_purchases`                    | [ ]    |
| 9.2 | Inventory by 5 dimensions            | 4     | TM1      | `/db-migration inventory`                         | [ ]    |
| 9.3 | 6-stage pipeline display             | 4     | TM1      | `/db-migration inventory`                         | [ ]    |
| 9.4 | Stage transition (one-tap)           | 4     | TM3      | `/api-endpoint PUT /api/inventory/:id/transition` | [ ]    |
| 9.5 | Inventory movement audit trail       | 4     | TM1      | `/db-migration inventory_movements`               | [ ]    |
| 9.6 | Inter-godown transfer (conditional)  | 4     | TM1      | `/db-migration inter_godown_transfers`            | [ ]    |
| 9.7 | Stock level display by godown        | 4     | TM3      | `/api-endpoint GET /api/inventory`                | [ ]    |
| 9.8 | Weight tracking at cone/woven stages | 4     | TM1      | `/db-migration inventory`                         | [ ]    |
| 9.9 | Batch traceability in inventory      | 4     | TM1      | `/db-migration inventory`                         | [ ]    |

### CL-DB-10: Production System (11 items)

| #     | Check Item                       | Phase | Teammate | Skill                                           | Status |
| ----- | -------------------------------- | ----- | -------- | ----------------------------------------------- | ------ |
| 10.1  | Cone issuance to wager           | 5     | TM1      | `/db-migration cone_issuances`                  | [ ]    |
| 10.2  | Paavu production recording       | 5     | TM1      | `/db-migration paavu_productions`               | [ ]    |
| 10.3  | Paavu wastage flagging           | 5     | TM3      | `/api-endpoint POST /api/paavu-productions`     | [ ]    |
| 10.4  | Production return (weight-based) | 5     | TM1      | `/db-migration production_returns`              | [ ]    |
| 10.5  | Production return (count-based)  | 5     | TM1      | `/db-migration production_returns`              | [ ]    |
| 10.6  | Production return with shift     | 5     | TM3      | `/api-endpoint POST /api/production-returns`    | [ ]    |
| 10.7  | Wastage validation               | 5     | TM3      | `/api-endpoint POST /api/production-returns`    | [ ]    |
| 10.8  | Loom downtime recording          | 5     | TM1      | `/db-migration loom_downtimes`                  | [ ]    |
| 10.9  | Downtime reasons                 | 5     | TM1      | `/db-migration loom_downtimes`                  | [ ]    |
| 10.10 | Shift configuration              | 5     | TM1      | `/db-migration shifts`                          | [ ]    |
| 10.11 | Performance calculation          | 5     | TM3      | `/api-endpoint GET /api/wagers/:id/performance` | [ ]    |

### CL-DB-11: Damage Management (7 items)

| #    | Check Item                             | Phase | Teammate | Skill                                               | Status |
| ---- | -------------------------------------- | ----- | -------- | --------------------------------------------------- | ------ |
| 11.1 | Damage recording at 4 detection points | 6     | TM1      | `/db-migration damage_records`                      | [ ]    |
| 11.2 | Damage grading (minor/major/reject)    | 6     | TM1      | `/db-migration damage_records`                      | [ ]    |
| 11.3 | Deduction calculation                  | 6     | TM3      | `/api-endpoint POST /api/damage-records`            | [ ]    |
| 11.4 | Owner approval workflow                | 6     | TM3      | `/api-endpoint PUT /api/damage-records/:id/approve` | [ ]    |
| 11.5 | Miscellaneous damage                   | 6     | TM3      | `/api-endpoint POST /api/damage-records`            | [ ]    |
| 11.6 | Wager traceability                     | 6     | TM1      | `/db-migration damage_records`                      | [ ]    |
| 11.7 | Deduction rate snapshot                | 6     | TM3      | `/api-endpoint POST /api/damage-records`            | [ ]    |

### CL-DB-12: Tailoring & Packaging (7 items)

| #    | Check Item                     | Phase | Teammate | Skill                                       | Status |
| ---- | ------------------------------ | ----- | -------- | ------------------------------------------- | ------ |
| 12.1 | Tailoring record entry         | 7     | TM1      | `/db-migration tailoring_records`           | [ ]    |
| 12.2 | Tailor wage auto-calculation   | 7     | TM3      | `/api-endpoint POST /api/tailoring-records` | [ ]    |
| 12.3 | Stitch/knot mismatch detection | 7     | TM3      | `/api-endpoint POST /api/tailoring-records` | [ ]    |
| 12.4 | Packaging record entry         | 7     | TM1      | `/db-migration packaging_records`           | [ ]    |
| 12.5 | Packager wage auto-calculation | 7     | TM3      | `/api-endpoint POST /api/packaging-records` | [ ]    |
| 12.6 | Bundle type selection          | 7     | TM3      | `/api-endpoint POST /api/packaging-records` | [ ]    |
| 12.7 | Inventory stage transitions    | 7     | TM3      | `/scaffold-module tailoring-records`        | [ ]    |

### CL-DB-13: Wage & Advance System (12 items)

| #     | Check Item                           | Phase | Teammate | Skill                                           | Status |
| ----- | ------------------------------------ | ----- | -------- | ----------------------------------------------- | ------ |
| 13.1  | Advance issuance                     | 8     | TM1      | `/db-migration advance_transactions`            | [ ]    |
| 13.2  | Advance balance tracking             | 8     | TM3      | `/api-endpoint POST /api/advances`              | [ ]    |
| 13.3  | Wage cycle auto-generation           | 8     | TM1      | `/db-migration wage_cycles`                     | [ ]    |
| 13.4  | Wage cycle status workflow           | 8     | TM3      | `/api-endpoint PUT /api/wage-cycles/:id/review` | [ ]    |
| 13.5  | Wager gross wage calculation         | 8     | TM3      | `/scaffold-module wage-cycles`                  | [ ]    |
| 13.6  | Advance deduction in wage            | 8     | TM3      | `/scaffold-module wage-cycles`                  | [ ]    |
| 13.7  | Damage deduction in wage             | 8     | TM3      | `/scaffold-module wage-cycles`                  | [ ]    |
| 13.8  | Net payable calculation              | 8     | TM3      | `/scaffold-module wage-cycles`                  | [ ]    |
| 13.9  | Negative balance / discretionary pay | 8     | TM3      | `/scaffold-module wage-cycles`                  | [ ]    |
| 13.10 | Discretionary → advance balance      | 8     | TM3      | `/scaffold-module wage-cycles`                  | [ ]    |
| 13.11 | All worker types in wage             | 8     | TM3      | `/scaffold-module wage-cycles`                  | [ ]    |
| 13.12 | Wager self-service wage view         | 8     | TM3      | `/api-endpoint GET /api/wagers/me/wages`        | [ ]    |

### CL-DB-14: Sales & Finance (15 items)

| #     | Check Item                        | Phase | Teammate | Skill                                           | Status |
| ----- | --------------------------------- | ----- | -------- | ----------------------------------------------- | ------ |
| 14.1  | Invoice creation                  | 9     | TM1      | `/db-migration invoices`                        | [ ]    |
| 14.2  | Auto invoice number generation    | 9     | TM3      | `/api-endpoint POST /api/invoices`              | [ ]    |
| 14.3  | GST auto-detection                | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 14.4  | CGST + SGST split (intra-state)   | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 14.5  | IGST (inter-state)                | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 14.6  | Due date calculation              | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 14.7  | Invoice status management         | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 14.8  | Partial payment recording         | 9     | TM1      | `/db-migration payments`                        | [ ]    |
| 14.9  | Payment → invoice balance update  | 9     | TM3      | `/api-endpoint POST /api/payments`              | [ ]    |
| 14.10 | Payment → customer balance update | 9     | TM3      | `/api-endpoint POST /api/payments`              | [ ]    |
| 14.11 | Overdue detection                 | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 14.12 | E-way bill support                | 9     | TM3      | `/api-endpoint GET /api/invoices/:id/eway-bill` | [ ]    |
| 14.13 | Payment aging report              | 9     | TM3      | `/api-endpoint GET /api/reports/customer-aging` | [ ]    |
| 14.14 | Multiple payment methods          | 9     | TM1      | `/db-migration payments`                        | [ ]    |
| 14.15 | Inventory to sold stage           | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |

### CL-DB-15: Notifications & Alerts (8 items)

| #    | Check Item                      | Phase | Teammate | Skill                                             | Status |
| ---- | ------------------------------- | ----- | -------- | ------------------------------------------------- | ------ |
| 15.1 | Notification creation on events | 10    | TM1      | `/db-migration notifications`                     | [ ]    |
| 15.2 | Notification read/unread        | 10    | TM3      | `/api-endpoint PUT /api/notifications/:id/read`   | [ ]    |
| 15.3 | Priority-based display          | 10    | TM1      | `/db-migration notifications`                     | [ ]    |
| 15.4 | User-scoped notifications       | 10    | TM1      | `/db-migration notifications`                     | [ ]    |
| 15.5 | Push notification integration   | 10    | TM3      | `/scaffold-module notifications`                  | [ ]    |
| 15.6 | Fraud alert creation            | 10    | TM1      | `/db-migration fraud_alerts`                      | [ ]    |
| 15.7 | Fraud alert resolution          | 10    | TM3      | `/api-endpoint PUT /api/fraud-alerts/:id/resolve` | [ ]    |
| 15.8 | Fraud alert access control      | 10    | TM3      | `/scaffold-module fraud-alerts`                   | [ ]    |

### CL-DB-16: RLS & Security (6 items)

| #    | Check Item                   | Phase | Teammate | Skill                             | Status |
| ---- | ---------------------------- | ----- | -------- | --------------------------------- | ------ |
| 16.1 | tenant_id on every table     | 1–10  | TM1      | `/db-migration [every table]`     | [ ]    |
| 16.2 | RLS policies active          | 1–10  | TM1      | `/db-migration [every table]`     | [ ]    |
| 16.3 | Wager sees only own data     | 1     | TM1      | `/db-migration users`             | [ ]    |
| 16.4 | Tailor sees only own data    | 7     | TM1      | `/db-migration tailoring_records` | [ ]    |
| 16.5 | Packager sees only own data  | 7     | TM1      | `/db-migration packaging_records` | [ ]    |
| 16.6 | Staff permission enforcement | 1     | TM1      | `/db-migration staff_permissions` | [ ]    |

### CL-DB-17: Reporting Queries (15 items)

| #     | Check Item                   | Phase | Teammate | Skill                                                | Status |
| ----- | ---------------------------- | ----- | -------- | ---------------------------------------------------- | ------ |
| 17.1  | Batch profitability report   | 11    | TM3      | `/api-endpoint GET /api/reports/batch-profitability` | [ ]    |
| 17.2  | Color profitability report   | 11    | TM3      | `/api-endpoint GET /api/reports/color-profitability` | [ ]    |
| 17.3  | Weekly wage sheet            | 11    | TM3      | `/api-endpoint GET /api/reports/wage-sheet/:cycleId` | [ ]    |
| 17.4  | Wager damage % report        | 11    | TM3      | `/api-endpoint GET /api/reports/wager-damage`        | [ ]    |
| 17.5  | Capacity utilization report  | 11    | TM3      | `/api-endpoint GET /api/reports/wager-utilization`   | [ ]    |
| 17.6  | Wager ranking                | 11    | TM3      | `/api-endpoint GET /api/reports/wager-ranking`       | [ ]    |
| 17.7  | Cone stock report            | 11    | TM3      | `/api-endpoint GET /api/reports/cone-stock`          | [ ]    |
| 17.8  | Finished stock by stage      | 11    | TM3      | `/api-endpoint GET /api/reports/finished-stock`      | [ ]    |
| 17.9  | GST summary report           | 11    | TM3      | `/api-endpoint GET /api/reports/gst-summary`         | [ ]    |
| 17.10 | Customer receivables aging   | 11    | TM3      | `/api-endpoint GET /api/reports/customer-aging`      | [ ]    |
| 17.11 | Stock movement history       | 11    | TM3      | `/api-endpoint GET /api/reports/stock-movement`      | [ ]    |
| 17.12 | Downtime report              | 11    | TM3      | `/api-endpoint GET /api/reports/downtime`            | [ ]    |
| 17.13 | Shift-wise production report | 11    | TM3      | `/api-endpoint GET /api/reports/shift-production`    | [ ]    |
| 17.14 | Supplier ledger              | 11    | TM3      | `/api-endpoint GET /api/reports/supplier-ledger`     | [ ]    |
| 17.15 | Revenue summary              | 11    | TM3      | `/api-endpoint GET /api/reports/revenue`             | [ ]    |

---

## CL-BE: Backend Checklist (149 Items)

### CL-BE-01: Foundation & Middleware (10 items)

| #    | Check Item                                | Phase | Teammate | Skill                           | Status |
| ---- | ----------------------------------------- | ----- | -------- | ------------------------------- | ------ |
| 1.1  | Health check endpoint returns 200         | 0     | TM3      | `/api-endpoint GET /api/health` | [ ]    |
| 1.2  | JWT token contains tenantId, userId, role | 0     | TM3      | `/scaffold-module auth`         | [ ]    |
| 1.3  | Tenant isolation via RLS                  | 0     | TM3      | `/scaffold-module auth`         | [ ]    |
| 1.4  | Role authorization (6 roles)              | 0     | TM3      | `/scaffold-module auth`         | [ ]    |
| 1.5  | Staff permission checks                   | 0     | TM3      | `/scaffold-module auth`         | [ ]    |
| 1.6  | Request validation (Zod)                  | 0     | TM3      | `/scaffold-module auth`         | [ ]    |
| 1.7  | Error response format                     | 0     | TM3      | `/scaffold-module auth`         | [ ]    |
| 1.8  | Audit logging on CRUD                     | 0     | TM3      | `/scaffold-module auth`         | [ ]    |
| 1.9  | Transaction rollback on failure           | 0     | TM3      | `/scaffold-module auth`         | [ ]    |
| 1.10 | Base repository tenant scoping            | 0     | TM3      | `/scaffold-module auth`         | [ ]    |

### CL-BE-02: Authentication (10 items)

| #    | Check Item                            | Phase | Teammate | Skill                                     | Status |
| ---- | ------------------------------------- | ----- | -------- | ----------------------------------------- | ------ |
| 2.1  | OTP send → store hashed OTP           | 1     | TM3      | `/api-endpoint POST /api/auth/otp/send`   | [ ]    |
| 2.2  | OTP verify → check hash + expiry      | 1     | TM3      | `/api-endpoint POST /api/auth/otp/verify` | [ ]    |
| 2.3  | PIN verify → hash compare             | 1     | TM3      | `/api-endpoint POST /api/auth/pin/verify` | [ ]    |
| 2.4  | PIN set/update → hash + store         | 1     | TM3      | `/api-endpoint PUT /api/auth/pin`         | [ ]    |
| 2.5  | Auth method check per tenant          | 1     | TM3      | `/scaffold-module auth`                   | [ ]    |
| 2.6  | Inactive user blocked                 | 1     | TM3      | `/scaffold-module auth`                   | [ ]    |
| 2.7  | Login response includes feature flags | 1     | TM3      | `/api-endpoint GET /api/auth/me`          | [ ]    |
| 2.8  | User language in auth response        | 1     | TM3      | `/api-endpoint GET /api/auth/me`          | [ ]    |
| 2.9  | Token refresh mechanism               | 1     | TM3      | `/api-endpoint POST /api/auth/refresh`    | [ ]    |
| 2.10 | OTP rate limiting                     | 1     | TM3      | `/scaffold-module auth`                   | [ ]    |

### CL-BE-03: Tenant & User Management (8 items)

| #   | Check Item                           | Phase | Teammate | Skill                                          | Status |
| --- | ------------------------------------ | ----- | -------- | ---------------------------------------------- | ------ |
| 3.1 | Create tenant → auto-create settings | 1     | TM3      | `/scaffold-module tenants`                     | [ ]    |
| 3.2 | Tenant status toggle                 | 1     | TM3      | `/api-endpoint PUT /api/tenants/:id/status`    | [ ]    |
| 3.3 | Tenant settings update               | 1     | TM3      | `/api-endpoint PUT /api/tenants/:id/settings`  | [ ]    |
| 3.4 | Create user with role                | 1     | TM3      | `/scaffold-module users`                       | [ ]    |
| 3.5 | Create wager → auto-create profile   | 1     | TM3      | `/scaffold-module users`                       | [ ]    |
| 3.6 | Unique phone per tenant              | 1     | TM3      | `/scaffold-module users`                       | [ ]    |
| 3.7 | Staff permission CRUD                | 1     | TM3      | `/api-endpoint PUT /api/users/:id/permissions` | [ ]    |
| 3.8 | User deactivation (soft)             | 1     | TM3      | `/api-endpoint PUT /api/users/:id/deactivate`  | [ ]    |

### CL-BE-04: Master Data (14 items)

| #    | Check Item                      | Phase | Teammate | Skill                                               | Status |
| ---- | ------------------------------- | ----- | -------- | --------------------------------------------------- | ------ |
| 4.1  | Loom type CRUD + capacity       | 2     | TM3      | `/scaffold-module loom-types`                       | [ ]    |
| 4.2  | Loom CRUD + wager assignment    | 2     | TM3      | `/scaffold-module looms`                            | [ ]    |
| 4.3  | Loom ownership validation       | 2     | TM3      | `/scaffold-module looms`                            | [ ]    |
| 4.4  | Product CRUD (all fields)       | 2     | TM3      | `/scaffold-module products`                         | [ ]    |
| 4.5  | Color price CRUD                | 2     | TM3      | `/api-endpoint POST /api/products/:id/color-prices` | [ ]    |
| 4.6  | Color price mode enforcement    | 2     | TM3      | `/scaffold-module products`                         | [ ]    |
| 4.7  | Shift wage rate CRUD            | 2     | TM3      | `/api-endpoint POST /api/products/:id/shift-rates`  | [ ]    |
| 4.8  | Shift rate feature flag check   | 2     | TM3      | `/scaffold-module products`                         | [ ]    |
| 4.9  | Supplier CRUD                   | 2     | TM3      | `/scaffold-module suppliers`                        | [ ]    |
| 4.10 | Customer CRUD + type validation | 2     | TM3      | `/scaffold-module customers`                        | [ ]    |
| 4.11 | Customer state_code for GST     | 2     | TM3      | `/scaffold-module customers`                        | [ ]    |
| 4.12 | Godown CRUD + main constraint   | 2     | TM3      | `/scaffold-module godowns`                          | [ ]    |
| 4.13 | Wager profile CRUD + type (1-4) | 2     | TM3      | `/scaffold-module wagers`                           | [ ]    |
| 4.14 | Wager self-service read         | 2     | TM3      | `/api-endpoint GET /api/wagers/me`                  | [ ]    |

### CL-BE-05: Batch System (5 items)

| #   | Check Item                                | Phase | Teammate | Skill                                       | Status |
| --- | ----------------------------------------- | ----- | -------- | ------------------------------------------- | ------ |
| 5.1 | Batch CRUD (conditional on flag)          | 3     | TM3      | `/scaffold-module batches`                  | [ ]    |
| 5.2 | Batch feature flag enforcement            | 3     | TM3      | `/scaffold-module batches`                  | [ ]    |
| 5.3 | Batch status lifecycle                    | 3     | TM3      | `/api-endpoint PUT /api/batches/:id/status` | [ ]    |
| 5.4 | Batch reopen from closed                  | 3     | TM3      | `/scaffold-module batches`                  | [ ]    |
| 5.5 | batch_id conditional in all creation APIs | 3–9   | TM3      | — (cross-cutting)                           | [ ]    |

### CL-BE-06: Inventory & Raw Materials (11 items)

| #    | Check Item                           | Phase | Teammate | Skill                                            | Status |
| ---- | ------------------------------------ | ----- | -------- | ------------------------------------------------ | ------ |
| 6.1  | Cone purchase → inventory (raw_cone) | 4     | TM3      | `/scaffold-module cone-purchases`                | [ ]    |
| 6.2  | Total cost auto-calc                 | 4     | TM3      | `/scaffold-module cone-purchases`                | [ ]    |
| 6.3  | GST amount auto-calc                 | 4     | TM3      | `/scaffold-module cone-purchases`                | [ ]    |
| 6.4  | Inventory query by dimensions        | 4     | TM3      | `/scaffold-module inventory`                     | [ ]    |
| 6.5  | Inventory stage summary              | 4     | TM3      | `/api-endpoint GET /api/inventory/summary`       | [ ]    |
| 6.6  | Stage transition APIs                | 4     | TM3      | `/scaffold-module inventory`                     | [ ]    |
| 6.7  | Movement history                     | 4     | TM3      | `/api-endpoint GET /api/inventory/:id/movements` | [ ]    |
| 6.8  | Inter-godown transfer (conditional)  | 4     | TM3      | `/scaffold-module transfers`                     | [ ]    |
| 6.9  | Transfer feature flag check          | 4     | TM3      | `/scaffold-module transfers`                     | [ ]    |
| 6.10 | Transfer src != dest validation      | 4     | TM3      | `/scaffold-module transfers`                     | [ ]    |
| 6.11 | Transfer inventory atomicity         | 4     | TM3      | `/scaffold-module transfers`                     | [ ]    |

### CL-BE-07: Production System (15 items)

| #    | Check Item                                | Phase | Teammate | Skill                                           | Status |
| ---- | ----------------------------------------- | ----- | -------- | ----------------------------------------------- | ------ |
| 7.1  | Cone issuance → raw_cone decrease         | 5     | TM3      | `/scaffold-module cone-issuances`               | [ ]    |
| 7.2  | Insufficient stock check                  | 5     | TM3      | `/scaffold-module cone-issuances`               | [ ]    |
| 7.3  | Paavu production → inventory transition   | 5     | TM3      | `/scaffold-module paavu-productions`            | [ ]    |
| 7.4  | Paavu wastage flag auto-set               | 5     | TM3      | `/scaffold-module paavu-productions`            | [ ]    |
| 7.5  | Production return (Type 1/3 weight-based) | 5     | TM3      | `/scaffold-module production-returns`           | [ ]    |
| 7.6  | Production return (Type 2/4 count-based)  | 5     | TM3      | `/scaffold-module production-returns`           | [ ]    |
| 7.7  | Return → woven inventory increase         | 5     | TM3      | `/scaffold-module production-returns`           | [ ]    |
| 7.8  | Wastage validation per wager type         | 5     | TM3      | `/scaffold-module production-returns`           | [ ]    |
| 7.9  | Shift-based return (conditional)          | 5     | TM3      | `/scaffold-module production-returns`           | [ ]    |
| 7.10 | Color substitution → fraud alert          | 5     | TM3      | `/scaffold-module production-returns`           | [ ]    |
| 7.11 | Loom downtime CRUD                        | 5     | TM3      | `/scaffold-module loom-downtimes`               | [ ]    |
| 7.12 | Downtime by owner OR wager                | 5     | TM3      | `/scaffold-module loom-downtimes`               | [ ]    |
| 7.13 | Shift CRUD (conditional)                  | 5     | TM3      | `/scaffold-module shifts`                       | [ ]    |
| 7.14 | Performance calculation                   | 5     | TM3      | `/api-endpoint GET /api/wagers/:id/performance` | [ ]    |
| 7.15 | Ranking visibility control                | 5     | TM3      | `/api-endpoint GET /api/wagers/ranking`         | [ ]    |

### CL-BE-08: Damage Management (9 items)

| #   | Check Item                          | Phase | Teammate | Skill                                               | Status |
| --- | ----------------------------------- | ----- | -------- | --------------------------------------------------- | ------ |
| 8.1 | Damage record creation              | 6     | TM3      | `/scaffold-module damage-records`                   | [ ]    |
| 8.2 | 4 detection points validated        | 6     | TM3      | `/scaffold-module damage-records`                   | [ ]    |
| 8.3 | 3 grade levels validated            | 6     | TM3      | `/scaffold-module damage-records`                   | [ ]    |
| 8.4 | Deduction rate from tenant settings | 6     | TM3      | `/scaffold-module damage-records`                   | [ ]    |
| 8.5 | Total deduction auto-calculated     | 6     | TM3      | `/scaffold-module damage-records`                   | [ ]    |
| 8.6 | Owner approval workflow             | 6     | TM3      | `/api-endpoint PUT /api/damage-records/:id/approve` | [ ]    |
| 8.7 | Miscellaneous damage handling       | 6     | TM3      | `/scaffold-module damage-records`                   | [ ]    |
| 8.8 | Wager traceability                  | 6     | TM3      | `/scaffold-module damage-records`                   | [ ]    |
| 8.9 | Wager sees only own damage          | 6     | TM3      | `/scaffold-module damage-records`                   | [ ]    |

### CL-BE-09: Tailoring & Packaging (10 items)

| #    | Check Item                    | Phase | Teammate | Skill                                | Status |
| ---- | ----------------------------- | ----- | -------- | ------------------------------------ | ------ |
| 9.1  | Tailoring record creation     | 7     | TM3      | `/scaffold-module tailoring-records` | [ ]    |
| 9.2  | Stitch wage auto-calc         | 7     | TM3      | `/scaffold-module tailoring-records` | [ ]    |
| 9.3  | Knot wage auto-calc           | 7     | TM3      | `/scaffold-module tailoring-records` | [ ]    |
| 9.4  | Total tailor wage             | 7     | TM3      | `/scaffold-module tailoring-records` | [ ]    |
| 9.5  | Woven → tailored transition   | 7     | TM3      | `/scaffold-module tailoring-records` | [ ]    |
| 9.6  | Mismatch detection            | 7     | TM3      | `/scaffold-module tailoring-records` | [ ]    |
| 9.7  | Packaging record creation     | 7     | TM3      | `/scaffold-module packaging-records` | [ ]    |
| 9.8  | Bundle type → pieces lookup   | 7     | TM3      | `/scaffold-module packaging-records` | [ ]    |
| 9.9  | Packager wage auto-calc       | 7     | TM3      | `/scaffold-module packaging-records` | [ ]    |
| 9.10 | Tailored → bundled transition | 7     | TM3      | `/scaffold-module packaging-records` | [ ]    |

### CL-BE-10: Wage & Advance (18 items)

| #     | Check Item                                | Phase | Teammate | Skill                                    | Status |
| ----- | ----------------------------------------- | ----- | -------- | ---------------------------------------- | ------ |
| 10.1  | Advance issuance                          | 8     | TM3      | `/scaffold-module advances`              | [ ]    |
| 10.2  | Balance_after snapshot                    | 8     | TM3      | `/scaffold-module advances`              | [ ]    |
| 10.3  | Wage cycle generation                     | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.4  | Cycle date range (weekly)                 | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.5  | Wager gross wage (per kg for Type 1/3)    | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.6  | Wager gross wage (per piece for Type 2/4) | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.7  | Shift-specific wage rates                 | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.8  | Tailor gross wage calc                    | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.9  | Packager gross wage calc                  | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.10 | Paavu Oati gross wage calc                | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.11 | Advance deduction                         | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.12 | Damage deduction                          | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.13 | Net payable formula                       | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.14 | Discretionary payment                     | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.15 | Discretionary → advance balance           | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.16 | Cycle status workflow                     | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.17 | All 4 worker types                        | 8     | TM3      | `/scaffold-module wage-cycles`           | [ ]    |
| 10.18 | Wager self-service wage view              | 8     | TM3      | `/api-endpoint GET /api/wagers/me/wages` | [ ]    |

### CL-BE-11: Sales & Finance (15 items)

| #     | Check Item                            | Phase | Teammate | Skill                                           | Status |
| ----- | ------------------------------------- | ----- | -------- | ----------------------------------------------- | ------ |
| 11.1  | Invoice creation + auto number        | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 11.2  | GST auto-detection (intra/inter)      | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 11.3  | CGST + SGST split                     | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 11.4  | IGST calculation                      | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 11.5  | Due date calculation                  | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 11.6  | Invoice status management             | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 11.7  | Payment recording                     | 9     | TM3      | `/scaffold-module payments`                     | [ ]    |
| 11.8  | Payment → invoice balance update      | 9     | TM3      | `/scaffold-module payments`                     | [ ]    |
| 11.9  | Payment → customer balance update     | 9     | TM3      | `/scaffold-module payments`                     | [ ]    |
| 11.10 | Overdue detection                     | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 11.11 | E-way bill JSON export                | 9     | TM3      | `/api-endpoint GET /api/invoices/:id/eway-bill` | [ ]    |
| 11.12 | Payment aging report                  | 9     | TM3      | `/api-endpoint GET /api/reports/customer-aging` | [ ]    |
| 11.13 | Payment method validation             | 9     | TM3      | `/scaffold-module payments`                     | [ ]    |
| 11.14 | Inventory → sold stage                | 9     | TM3      | `/scaffold-module invoices`                     | [ ]    |
| 11.15 | Bill-to-bill full payment enforcement | 9     | TM3      | `/scaffold-module payments`                     | [ ]    |

### CL-BE-12: Notifications & Alerts (8 items)

| #    | Check Item                 | Phase | Teammate | Skill                            | Status |
| ---- | -------------------------- | ----- | -------- | -------------------------------- | ------ |
| 12.1 | Notification CRUD          | 10    | TM3      | `/scaffold-module notifications` | [ ]    |
| 12.2 | Read/unread management     | 10    | TM3      | `/scaffold-module notifications` | [ ]    |
| 12.3 | User-scoped notifications  | 10    | TM3      | `/scaffold-module notifications` | [ ]    |
| 12.4 | 11 event triggers          | 10    | TM3      | `/scaffold-module notifications` | [ ]    |
| 12.5 | FCM push integration       | 10    | TM3      | `/scaffold-module notifications` | [ ]    |
| 12.6 | 7 fraud alert types        | 10    | TM3      | `/scaffold-module fraud-alerts`  | [ ]    |
| 12.7 | Fraud alert access control | 10    | TM3      | `/scaffold-module fraud-alerts`  | [ ]    |
| 12.8 | Fraud alert resolution     | 10    | TM3      | `/scaffold-module fraud-alerts`  | [ ]    |

### CL-BE-13: Reports (16 items)

| #     | Check Item                                | Phase | Teammate | Skill                                                | Status |
| ----- | ----------------------------------------- | ----- | -------- | ---------------------------------------------------- | ------ |
| 13.1  | Production summary (daily/weekly/monthly) | 11    | TM3      | `/scaffold-module reports`                           | [ ]    |
| 13.2  | Batch profitability                       | 11    | TM3      | `/api-endpoint GET /api/reports/batch-profitability` | [ ]    |
| 13.3  | Color profitability                       | 11    | TM3      | `/api-endpoint GET /api/reports/color-profitability` | [ ]    |
| 13.4  | Weekly wage sheet                         | 11    | TM3      | `/api-endpoint GET /api/reports/wage-sheet/:cycleId` | [ ]    |
| 13.5  | Wager damage %                            | 11    | TM3      | `/api-endpoint GET /api/reports/wager-damage`        | [ ]    |
| 13.6  | Capacity utilization                      | 11    | TM3      | `/api-endpoint GET /api/reports/wager-utilization`   | [ ]    |
| 13.7  | Wager ranking                             | 11    | TM3      | `/api-endpoint GET /api/reports/wager-ranking`       | [ ]    |
| 13.8  | Cone stock report                         | 11    | TM3      | `/api-endpoint GET /api/reports/cone-stock`          | [ ]    |
| 13.9  | Finished stock by stage                   | 11    | TM3      | `/api-endpoint GET /api/reports/finished-stock`      | [ ]    |
| 13.10 | GST summary                               | 11    | TM3      | `/api-endpoint GET /api/reports/gst-summary`         | [ ]    |
| 13.11 | Customer aging                            | 11    | TM3      | `/api-endpoint GET /api/reports/customer-aging`      | [ ]    |
| 13.12 | Stock movement                            | 11    | TM3      | `/api-endpoint GET /api/reports/stock-movement`      | [ ]    |
| 13.13 | Downtime report                           | 11    | TM3      | `/api-endpoint GET /api/reports/downtime`            | [ ]    |
| 13.14 | Shift-wise production                     | 11    | TM3      | `/api-endpoint GET /api/reports/shift-production`    | [ ]    |
| 13.15 | Supplier ledger                           | 11    | TM3      | `/api-endpoint GET /api/reports/supplier-ledger`     | [ ]    |
| 13.16 | Revenue summary (daily/weekly/monthly)    | 11    | TM3      | `/api-endpoint GET /api/reports/revenue`             | [ ]    |

---

## Summary Dashboard

### CL-DB by Phase

| Phase     | Items   | Categories                                                                                   |
| --------- | ------- | -------------------------------------------------------------------------------------------- |
| 1         | 21      | CL-DB-01 (11), CL-DB-02 (10)                                                                 |
| 2         | 43      | CL-DB-03 (6), CL-DB-04 (11), CL-DB-05 (6), CL-DB-06 (4), CL-DB-07 (5), plus CL-DB-16 partial |
| 3         | 4       | CL-DB-08 (4 of 5)                                                                            |
| 4         | 9       | CL-DB-09 (9)                                                                                 |
| 5         | 11      | CL-DB-10 (11)                                                                                |
| 6         | 7       | CL-DB-11 (7)                                                                                 |
| 7         | 7       | CL-DB-12 (7), CL-DB-16.4, CL-DB-16.5                                                         |
| 8         | 12      | CL-DB-13 (12)                                                                                |
| 9         | 15      | CL-DB-14 (15)                                                                                |
| 10        | 8       | CL-DB-15 (8)                                                                                 |
| 11        | 16      | CL-DB-17 (15), CL-DB-08.5                                                                    |
| **Total** | **148** |                                                                                              |

### CL-BE by Phase

| Phase     | Items   | Categories                  |
| --------- | ------- | --------------------------- |
| 0         | 10      | CL-BE-01 (10)               |
| 1         | 18      | CL-BE-02 (10), CL-BE-03 (8) |
| 2         | 14      | CL-BE-04 (14)               |
| 3         | 5       | CL-BE-05 (5)                |
| 4         | 11      | CL-BE-06 (11)               |
| 5         | 15      | CL-BE-07 (15)               |
| 6         | 9       | CL-BE-08 (9)                |
| 7         | 10      | CL-BE-09 (10)               |
| 8         | 18      | CL-BE-10 (18)               |
| 9         | 15      | CL-BE-11 (15)               |
| 10        | 8       | CL-BE-12 (8)                |
| 11        | 16      | CL-BE-13 (16)               |
| **Total** | **149** |                             |

### Teammate Workload

| Teammate               | CL-DB Items | CL-BE Items | Total              |
| ---------------------- | ----------- | ----------- | ------------------ |
| TM1 (DB Architect)     | ~105        | 0           | ~105               |
| TM3 (Backend Builder)  | ~43         | 149         | ~192               |
| TM5 (QA Engineer)      | —           | —           | Tests for all      |
| TM6 (Progress Tracker) | —           | —           | Validates all      |
| TM7 (Challenger)       | —           | —           | Reviews milestones |
| TM2 (Domain Advisor)   | —           | —           | On-demand          |
| TM4 (UX Guardian)      | —           | —           | i18n + UI          |
