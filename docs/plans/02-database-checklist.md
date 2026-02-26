# Database Integration Checklist

## Purpose

This checklist validates that the DB schema supports all Backend API endpoints and Frontend UI requirements. Each item maps a DB table/column to its Backend consumer and Frontend display.

---

## CL-DB-01: Tenant Management

### Tables: `tenants`, `tenant_settings`

| #    | Check Item                                        | DB Source                                              | Backend Integration                    | Frontend Integration                     | Status |
| ---- | ------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- | ---------------------------------------- | ------ |
| 1.1  | Tenant CRUD operations                            | `tenants` table                                        | `POST/GET/PUT /api/tenants`            | Super Admin panel                        | [ ]    |
| 1.2  | Tenant status management (active/suspended/trial) | `tenants.status`                                       | Status toggle API                      | Super Admin tenant list                  | [ ]    |
| 1.3  | Tenant settings CRUD                              | `tenant_settings`                                      | `GET/PUT /api/tenants/:id/settings`    | Owner settings page                      | [ ]    |
| 1.4  | Batch mode toggle                                 | `tenant_settings.batch_enabled`                        | Feature flag in all batch-related APIs | Conditional UI rendering of batch fields | [ ]    |
| 1.5  | Shift mode toggle                                 | `tenant_settings.shift_enabled`                        | Feature flag in production APIs        | Conditional shift selector in forms      | [ ]    |
| 1.6  | Inter-godown transfer toggle                      | `tenant_settings.inter_godown_transfer_enabled`        | Feature flag in transfer APIs          | Show/hide transfer menu item             | [ ]    |
| 1.7  | Auth method config (OTP/PIN)                      | `tenant_settings.auth_otp_enabled`, `auth_pin_enabled` | Auth flow selection logic              | Login form variant display               | [ ]    |
| 1.8  | Wage cycle day config                             | `tenant_settings.wage_cycle_day`                       | Wage cycle auto-generation scheduler   | Settings form dropdown (Sun-Sat)         | [ ]    |
| 1.9  | Damage deduction rates                            | `tenant_settings.damage_*_deduction_pct`               | Damage deduction calculation           | Settings form for grade percentages      | [ ]    |
| 1.10 | Wager ranking visibility                          | `tenant_settings.show_wager_ranking`                   | Conditional ranking data in wager API  | Show/hide ranking section                | [ ]    |
| 1.11 | GST state detection                               | `tenants.state_code` vs `customers.state_code`         | Invoice tax type auto-detection        | Auto-populated in invoice form           | [ ]    |

---

## CL-DB-02: Authentication & Users

### Tables: `users`, `staff_permissions`, `otp_codes`

| #    | Check Item                        | DB Source                       | Backend Integration                                    | Frontend Integration                    | Status |
| ---- | --------------------------------- | ------------------------------- | ------------------------------------------------------ | --------------------------------------- | ------ |
| 2.1  | Phone OTP login flow              | `users.phone`, `otp_codes`      | `POST /api/auth/otp/send`, `POST /api/auth/otp/verify` | OTP input screen                        | [ ]    |
| 2.2  | PIN login flow                    | `users.phone`, `users.pin_hash` | `POST /api/auth/pin/verify`                            | PIN entry screen                        | [ ]    |
| 2.3  | User CRUD (per tenant)            | `users`                         | `POST/GET/PUT /api/users`                              | User management page                    | [ ]    |
| 2.4  | Role-based routing                | `users.role`                    | JWT token contains role, middleware checks             | Role-specific dashboard routing         | [ ]    |
| 2.5  | Staff permission assignment       | `staff_permissions`             | `POST/DELETE /api/users/:id/permissions`               | Permission checkboxes in staff form     | [ ]    |
| 2.6  | Staff permission enforcement      | `staff_permissions.permission`  | Middleware checks permission before API access         | Menu items visible based on permissions | [ ]    |
| 2.7  | User language preference          | `users.language`                | Included in auth response                              | i18n locale switching                   | [ ]    |
| 2.8  | User active/inactive toggle       | `users.is_active`               | Inactive users blocked at login                        | Visual indicator in user list           | [ ]    |
| 2.9  | Composite unique phone per tenant | `users(tenant_id, phone)`       | Validate uniqueness on user creation                   | Error message on duplicate phone        | [ ]    |
| 2.10 | Super Admin cross-tenant access   | `users.role = 'super_admin'`    | Bypass tenant_id scoping                               | Platform admin dashboard                | [ ]    |

---

## CL-DB-03: Loom Management

### Tables: `loom_types`, `looms`

| #   | Check Item              | DB Source                            | Backend Integration                | Frontend Integration          | Status |
| --- | ----------------------- | ------------------------------------ | ---------------------------------- | ----------------------------- | ------ |
| 3.1 | Loom type CRUD          | `loom_types`                         | `POST/GET/PUT /api/loom-types`     | Loom type management form     | [ ]    |
| 3.2 | Capacity per loom type  | `loom_types.capacity_pieces_per_day` | Performance calculation API        | Display in loom type card     | [ ]    |
| 3.3 | Individual loom CRUD    | `looms`                              | `POST/GET/PUT /api/looms`          | Loom registry page            | [ ]    |
| 3.4 | Loom-wager assignment   | `looms.assigned_wager_id`            | `PUT /api/looms/:id/assign`        | Wager dropdown in loom form   | [ ]    |
| 3.5 | Loom ownership tracking | `looms.ownership`                    | Affects wager type validation      | Ownership badge on loom card  | [ ]    |
| 3.6 | Maintenance status      | `looms.maintenance_status`           | Filter active looms for production | Status indicator on loom list | [ ]    |

---

## CL-DB-04: Product Master

### Tables: `products`, `product_color_prices`, `shift_wage_rates`

| #    | Check Item                                   | DB Source                                                            | Backend Integration                       | Frontend Integration                  | Status |
| ---- | -------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------- | ------ |
| 4.1  | Product CRUD                                 | `products`                                                           | `POST/GET/PUT /api/products`              | Product master form (large form)      | [ ]    |
| 4.2  | Paavu/Oodai consumption config               | `products.paavu_consumption_grams`, `oodai_consumption_grams`        | Wastage validation in production          | Product form fields                   | [ ]    |
| 4.3  | Wage rates (per kg & per piece)              | `products.wage_rate_per_kg`, `wage_rate_per_piece`                   | Wage calculation API                      | Product form wage section             | [ ]    |
| 4.4  | Stitch & knot rates                          | `products.stitch_rate_per_piece`, `knot_rate_per_piece`              | Tailor wage calculation                   | Product form tailor section           | [ ]    |
| 4.5  | Bundle config & rates                        | `products.small_bundle_count`, `large_bundle_count`, `bundle_rate_*` | Packaging wage calculation                | Product form bundle section           | [ ]    |
| 4.6  | GST rate per product                         | `products.gst_rate_pct`                                              | Invoice tax calculation                   | Product form, auto-applied on invoice | [ ]    |
| 4.7  | Color pricing Mode 1 (average)               | `products.color_pricing_mode = 'average'`                            | Average price in invoice generation       | Single price field                    | [ ]    |
| 4.8  | Color pricing Mode 2 (per-color)             | `product_color_prices`                                               | Per-color price lookup                    | Color-price list in product form      | [ ]    |
| 4.9  | Shift-wise wage rates                        | `shift_wage_rates`                                                   | Override default rates when shift_enabled | Conditional shift rate table          | [ ]    |
| 4.10 | Product category (single/double/triple/quad) | `products.category`                                                  | Filter and grouping                       | Category selector in form             | [ ]    |
| 4.11 | HSN code for GST                             | `products.hsn_code`                                                  | Included in invoice items                 | HSN field in product form             | [ ]    |

---

## CL-DB-05: Suppliers & Customers

### Tables: `suppliers`, `customers`

| #   | Check Item                   | DB Source                       | Backend Integration                     | Frontend Integration             | Status |
| --- | ---------------------------- | ------------------------------- | --------------------------------------- | -------------------------------- | ------ |
| 5.1 | Supplier CRUD                | `suppliers`                     | `POST/GET/PUT /api/suppliers`           | Supplier management page         | [ ]    |
| 5.2 | Customer CRUD                | `customers`                     | `POST/GET/PUT /api/customers`           | Customer management page         | [ ]    |
| 5.3 | Customer type selection      | `customers.customer_type`       | Payment validation logic                | Type selector (3 options)        | [ ]    |
| 5.4 | Credit period per customer   | `customers.credit_period_days`  | Due date calculation, overdue detection | Credit period input field        | [ ]    |
| 5.5 | Outstanding balance tracking | `customers.outstanding_balance` | Updated on invoice/payment events       | Balance display on customer card | [ ]    |
| 5.6 | Customer state code for GST  | `customers.state_code`          | Tax type auto-detection                 | State dropdown in customer form  | [ ]    |

---

## CL-DB-06: Godowns

### Tables: `godowns`

| #   | Check Item                   | DB Source             | Backend Integration                       | Frontend Integration     | Status |
| --- | ---------------------------- | --------------------- | ----------------------------------------- | ------------------------ | ------ |
| 6.1 | Godown CRUD                  | `godowns`             | `POST/GET/PUT /api/godowns`               | Godown management page   | [ ]    |
| 6.2 | Main godown designation      | `godowns.is_main`     | Default godown selection                  | Main godown badge        | [ ]    |
| 6.3 | Paavu Pattarai type          | `godowns.godown_type` | Filter for paavu production               | Type indicator in list   | [ ]    |
| 6.4 | Godown dropdown in all forms | `godowns.id`          | Referenced in inventory, production, etc. | Godown selector dropdown | [ ]    |

---

## CL-DB-07: Wager Profiles

### Tables: `wager_profiles`

| #   | Check Item                                | DB Source                                                | Backend Integration                            | Frontend Integration                       | Status |
| --- | ----------------------------------------- | -------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------ | ------ |
| 7.1 | Wager profile CRUD                        | `wager_profiles`                                         | `POST/GET/PUT /api/wagers`                     | Wager management page                      | [ ]    |
| 7.2 | Wager type (1-4)                          | `wager_profiles.wager_type`                              | Determines return validation (weight vs count) | Type selector, affects form fields         | [ ]    |
| 7.3 | Advance balance display                   | `wager_profiles.advance_balance`                         | Read on wage calculation                       | Balance shown in wager card & self-service | [ ]    |
| 7.4 | Original vs additional advance separation | `wager_profiles.original_advance`, `additional_advances` | Breakdown in advance report                    | Advance breakdown in wager detail          | [ ]    |
| 7.5 | Wager-user 1:1 link                       | `wager_profiles.user_id` UNIQUE                          | Auto-create profile on wager user creation     | Linked in user management                  | [ ]    |

---

## CL-DB-08: Batch System

### Tables: `batches`

| #   | Check Item                              | DB Source                                  | Backend Integration                                   | Frontend Integration                    | Status |
| --- | --------------------------------------- | ------------------------------------------ | ----------------------------------------------------- | --------------------------------------- | ------ |
| 8.1 | Batch CRUD (conditional)                | `batches`                                  | `POST/GET/PUT /api/batches` — only when batch_enabled | Batch management page (hidden when OFF) | [ ]    |
| 8.2 | Batch status transitions                | `batches.status` (open/in_progress/closed) | Status update API                                     | Status badge and transition buttons     | [ ]    |
| 8.3 | Batch reopen capability                 | `batches.status` closed → open             | Reopen API endpoint                                   | Reopen button on closed batches         | [ ]    |
| 8.4 | Batch_id nullable in all related tables | All FK → batches NULLABLE                  | Conditional inclusion in queries                      | Batch selector hidden when batch OFF    | [ ]    |
| 8.5 | Batch profitability data                | `batches` + related tables                 | Profitability calculation API                         | Batch profitability report              | [ ]    |

---

## CL-DB-09: Inventory System

### Tables: `inventory`, `inventory_movements`, `cone_purchases`, `inter_godown_transfers`

| #   | Check Item                           | DB Source                        | Backend Integration                        | Frontend Integration               | Status |
| --- | ------------------------------------ | -------------------------------- | ------------------------------------------ | ---------------------------------- | ------ |
| 9.1 | Cone purchase recording              | `cone_purchases`                 | `POST /api/cone-purchases`                 | Cone purchase form                 | [ ]    |
| 9.2 | Inventory by 5 dimensions            | `inventory` unique constraint    | All inventory queries scoped by dimensions | Stock view with filters            | [ ]    |
| 9.3 | 6-stage pipeline display             | `inventory.stage` enum           | Stage-filtered queries                     | Stage tabs in inventory view       | [ ]    |
| 9.4 | Stage transition (one-tap)           | `inventory.stage` updates        | Stage transition APIs                      | One-tap transition buttons         | [ ]    |
| 9.5 | Inventory movement audit trail       | `inventory_movements`            | Movement history API                       | Movement log per inventory item    | [ ]    |
| 9.6 | Inter-godown transfer (conditional)  | `inter_godown_transfers`         | Transfer API (only when enabled)           | Transfer form (hidden when OFF)    | [ ]    |
| 9.7 | Stock level display by godown        | `inventory` grouped by godown_id | Stock summary API                          | Godown-wise stock dashboard        | [ ]    |
| 9.8 | Weight tracking at cone/woven stages | `inventory.weight_kg`            | Weight-based queries                       | Weight display for relevant stages | [ ]    |
| 9.9 | Batch traceability in inventory      | `inventory.batch_id`             | Batch-filtered inventory queries           | Batch filter in stock view         | [ ]    |

---

## CL-DB-10: Production System

### Tables: `cone_issuances`, `paavu_productions`, `production_returns`, `loom_downtimes`, `shifts`

| #     | Check Item                       | DB Source                                                       | Backend Integration                             | Frontend Integration                   | Status |
| ----- | -------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------- | ------ |
| 10.1  | Cone issuance to wager           | `cone_issuances`                                                | `POST /api/cone-issuances`                      | Issuance form (wager + weight + color) | [ ]    |
| 10.2  | Paavu production recording       | `paavu_productions`                                             | `POST /api/paavu-productions`                   | Paavu production form                  | [ ]    |
| 10.3  | Paavu wastage flagging           | `paavu_productions.wastage_flag`                                | Auto-flag when wastage > limit                  | Warning indicator on flagged records   | [ ]    |
| 10.4  | Production return (weight-based) | `production_returns.return_weight_kg`                           | Mandatory for Type 1 & 3                        | Weight input (required for Type 1/3)   | [ ]    |
| 10.5  | Production return (count-based)  | `production_returns.return_count`                               | Mandatory for Type 2 & 4                        | Count input (required for Type 2/4)    | [ ]    |
| 10.6  | Production return with shift     | `production_returns.shift`                                      | Only when shift_enabled                         | Shift selector (conditional)           | [ ]    |
| 10.7  | Wastage validation               | `production_returns.wastage_grams/flag`                         | Validate against allowed wastage per wager type | Wastage warning display                | [ ]    |
| 10.8  | Loom downtime recording          | `loom_downtimes`                                                | `POST /api/loom-downtimes`                      | Downtime form (owner & wager)          | [ ]    |
| 10.9  | Downtime reasons                 | `loom_downtimes.reason` enum                                    | Reason selection in API                         | Reason dropdown (4 options + custom)   | [ ]    |
| 10.10 | Shift configuration              | `shifts`                                                        | `POST/GET /api/shifts` (when shift_enabled)     | Shift management (conditional)         | [ ]    |
| 10.11 | Performance calculation          | `production_returns` + `loom_types.capacity` - `loom_downtimes` | `GET /api/wagers/:id/performance`               | Performance dashboard / ranking        | [ ]    |

---

## CL-DB-11: Damage Management

### Tables: `damage_records`

| #    | Check Item                             | DB Source                                        | Backend Integration                        | Frontend Integration                 | Status |
| ---- | -------------------------------------- | ------------------------------------------------ | ------------------------------------------ | ------------------------------------ | ------ |
| 11.1 | Damage recording at 4 detection points | `damage_records.detection_point`                 | `POST /api/damage-records`                 | Detection point selector             | [ ]    |
| 11.2 | Damage grading (minor/major/reject)    | `damage_records.grade`                           | Grade selection, rate lookup               | Grade selector (3 options)           | [ ]    |
| 11.3 | Deduction calculation                  | `damage_records.total_deduction`                 | Auto-calculate: count _ cost _ rate%       | Auto-calculated display              | [ ]    |
| 11.4 | Owner approval workflow                | `damage_records.approval_status`                 | `PUT /api/damage-records/:id/approve`      | Approval button (owner only)         | [ ]    |
| 11.5 | Miscellaneous damage                   | `damage_records.is_miscellaneous`                | Set when wager unidentifiable              | "Miscellaneous" checkbox/auto-detect | [ ]    |
| 11.6 | Wager traceability                     | `damage_records.wager_id` → `production_returns` | Trace damage to original wager             | Wager link in damage detail          | [ ]    |
| 11.7 | Deduction rate snapshot                | `damage_records.deduction_rate_pct`              | Copy from tenant_settings at creation time | Display in damage detail             | [ ]    |

---

## CL-DB-12: Tailoring & Packaging

### Tables: `tailoring_records`, `packaging_records`

| #    | Check Item                     | DB Source                                                  | Backend Integration                       | Frontend Integration                 | Status |
| ---- | ------------------------------ | ---------------------------------------------------------- | ----------------------------------------- | ------------------------------------ | ------ |
| 12.1 | Tailoring record entry         | `tailoring_records`                                        | `POST /api/tailoring-records`             | Tailoring form (stitch + knot count) | [ ]    |
| 12.2 | Tailor wage auto-calculation   | `tailoring_records.stitch_wage`, `knot_wage`, `total_wage` | Auto-calc from product rates              | Auto-calculated wage display         | [ ]    |
| 12.3 | Stitch/knot mismatch detection | `tailoring_records.mismatch_flag`                          | Validate against woven stock              | Mismatch warning indicator           | [ ]    |
| 12.4 | Packaging record entry         | `packaging_records`                                        | `POST /api/packaging-records`             | Packaging form (bundle type + count) | [ ]    |
| 12.5 | Packager wage auto-calculation | `packaging_records.total_wage`                             | Auto-calc from product rates              | Auto-calculated wage display         | [ ]    |
| 12.6 | Bundle type selection          | `packaging_records.bundle_type`                            | Determines pieces_per_bundle from product | Small/Large toggle                   | [ ]    |
| 12.7 | Inventory stage transitions    | Woven → Tailored → Bundled                                 | Auto-update inventory on record creation  | Stage badges update                  | [ ]    |

---

## CL-DB-13: Wage & Advance System

### Tables: `advance_transactions`, `wage_cycles`, `wage_records`

| #     | Check Item                           | DB Source                                                               | Backend Integration                                  | Frontend Integration               | Status |
| ----- | ------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------- | ------ |
| 13.1  | Advance issuance                     | `advance_transactions` (type=advance_given)                             | `POST /api/advances`                                 | Advance form (wager + amount)      | [ ]    |
| 13.2  | Advance balance tracking             | `wager_profiles.advance_balance` + `advance_transactions.balance_after` | Balance in wager API response                        | Balance display in wager card      | [ ]    |
| 13.3  | Wage cycle auto-generation           | `wage_cycles`                                                           | Scheduled job on tenant's wage_cycle_day             | Wage cycle list page               | [ ]    |
| 13.4  | Wage cycle status workflow           | `wage_cycles.status` (draft→review→approved→paid)                       | Status transition APIs                               | Status buttons and workflow UI     | [ ]    |
| 13.5  | Wager gross wage calculation         | `wage_records.gross_wage`                                               | Sum production returns \* rate (per kg or per piece) | Wage breakdown display             | [ ]    |
| 13.6  | Advance deduction in wage            | `wage_records.advance_deduction`                                        | Configurable amount deducted per cycle               | Deduction line in wage sheet       | [ ]    |
| 13.7  | Damage deduction in wage             | `wage_records.damage_deduction`                                         | Sum approved damage deductions for the week          | Deduction line in wage sheet       | [ ]    |
| 13.8  | Net payable calculation              | `wage_records.net_payable`                                              | gross - advance - damage                             | Highlighted net amount             | [ ]    |
| 13.9  | Negative balance / discretionary pay | `wage_records.discretionary_amount`                                     | Owner can set amount even when net<=0                | Discretionary input (owner only)   | [ ]    |
| 13.10 | Discretionary → advance balance      | `advance_transactions` (type=discretionary_addition)                    | Auto-add to advance balance                          | Balance update reflected           | [ ]    |
| 13.11 | All worker types in wage             | `wage_records.worker_type` (wager/tailor/packager/paavu_oati)           | Wage records for all worker types                    | Tabs per worker type in wage sheet | [ ]    |
| 13.12 | Wager self-service wage view         | `wage_records` WHERE worker_id = current_user                           | Filtered by RLS / API scoping                        | Wager's own wage history page      | [ ]    |

---

## CL-DB-14: Sales & Finance

### Tables: `invoices`, `invoice_items`, `payments`

| #     | Check Item                        | DB Source                                       | Backend Integration                              | Frontend Integration            | Status |
| ----- | --------------------------------- | ----------------------------------------------- | ------------------------------------------------ | ------------------------------- | ------ |
| 14.1  | Invoice creation                  | `invoices`, `invoice_items`                     | `POST /api/invoices`                             | Invoice creation form           | [ ]    |
| 14.2  | Auto invoice number generation    | `invoices.invoice_number`                       | Auto-generated per tenant                        | Read-only in form               | [ ]    |
| 14.3  | GST auto-detection                | `invoices.tax_type`                             | Compare tenant.state_code vs customer.state_code | Auto-populated tax section      | [ ]    |
| 14.4  | CGST + SGST split (intra-state)   | `invoices.cgst_amount`, `sgst_amount`           | Each = subtotal \* (gst_rate/2)                  | Two tax lines in invoice        | [ ]    |
| 14.5  | IGST (inter-state)                | `invoices.igst_amount`                          | = subtotal \* gst_rate                           | Single tax line in invoice      | [ ]    |
| 14.6  | Due date calculation              | `invoices.due_date`                             | invoice_date + customer.credit_period_days       | Auto-populated in form          | [ ]    |
| 14.7  | Invoice status management         | `invoices.status` (6 states)                    | Status auto-updates on payment                   | Status badge on invoice list    | [ ]    |
| 14.8  | Partial payment recording         | `payments`                                      | `POST /api/payments`                             | Payment form against invoice    | [ ]    |
| 14.9  | Payment → invoice balance update  | `invoices.amount_paid`, `balance_due`           | Auto-update on payment creation                  | Real-time balance display       | [ ]    |
| 14.10 | Payment → customer balance update | `customers.outstanding_balance`                 | Auto-update on payment                           | Customer card balance refresh   | [ ]    |
| 14.11 | Overdue detection                 | `invoices.due_date` < today AND balance_due > 0 | Scheduled check / query filter                   | Overdue badge, notification     | [ ]    |
| 14.12 | E-way bill support                | `invoices.eway_bill_number`                     | Optional field in invoice API                    | E-way bill input in form        | [ ]    |
| 14.13 | Payment aging report              | `invoices` grouped by age                       | Aging calculation API (0-30/30-60/60-90/90+)     | Aging report table              | [ ]    |
| 14.14 | Multiple payment methods          | `payments.payment_method` (5 options)           | Payment method selection                         | Method dropdown in payment form | [ ]    |
| 14.15 | Inventory to sold stage           | `inventory.stage` → 'sold'                      | Auto-update on invoice dispatch                  | Stage badge updates             | [ ]    |

---

## CL-DB-15: Notifications & Alerts

### Tables: `notifications`, `fraud_alerts`

| #    | Check Item                      | DB Source                     | Backend Integration                    | Frontend Integration              | Status |
| ---- | ------------------------------- | ----------------------------- | -------------------------------------- | --------------------------------- | ------ |
| 15.1 | Notification creation on events | `notifications`               | Event-driven creation (11 event types) | Bell icon with unread count       | [ ]    |
| 15.2 | Notification read/unread        | `notifications.is_read`       | `PUT /api/notifications/:id/read`      | Read/unread visual state          | [ ]    |
| 15.3 | Priority-based display          | `notifications.priority`      | Priority in response                   | Priority indicator (color/icon)   | [ ]    |
| 15.4 | User-scoped notifications       | `notifications.user_id` + RLS | Only own notifications returned        | Personal notification panel       | [ ]    |
| 15.5 | Push notification integration   | `notifications` → FCM         | FCM push on notification creation      | Mobile push notification          | [ ]    |
| 15.6 | Fraud alert creation            | `fraud_alerts` (7 types)      | Event-driven detection engine          | Alert panel (owner only)          | [ ]    |
| 15.7 | Fraud alert resolution          | `fraud_alerts.is_resolved`    | `PUT /api/fraud-alerts/:id/resolve`    | Resolve button on alert card      | [ ]    |
| 15.8 | Fraud alert access control      | `fraud_alerts` + RLS          | Only owner + authorized staff          | Hidden from wager/tailor/packager | [ ]    |

---

## CL-DB-16: RLS & Security

| #    | Check Item                   | DB Source                              | Backend Integration                      | Frontend Integration                  | Status |
| ---- | ---------------------------- | -------------------------------------- | ---------------------------------------- | ------------------------------------- | ------ |
| 16.1 | tenant_id on every table     | All 36 tables                          | Middleware sets tenant context           | N/A (transparent)                     | [ ]    |
| 16.2 | RLS policies active          | All tables have policies               | `SET app.current_tenant` on each request | N/A (transparent)                     | [ ]    |
| 16.3 | Wager sees only own data     | RLS on production, wage, damage        | Filtered queries                         | Self-service pages show only own data | [ ]    |
| 16.4 | Tailor sees only own data    | RLS on tailoring_records, wage_records | Filtered queries                         | Self-service pages                    | [ ]    |
| 16.5 | Packager sees only own data  | RLS on packaging_records, wage_records | Filtered queries                         | Self-service pages                    | [ ]    |
| 16.6 | Staff permission enforcement | `staff_permissions`                    | Permission middleware                    | Menu item visibility                  | [ ]    |

---

## CL-DB-17: Reporting Queries

| #     | Check Item                   | DB Source                                                         | Backend Integration                        | Frontend Integration         | Status |
| ----- | ---------------------------- | ----------------------------------------------------------------- | ------------------------------------------ | ---------------------------- | ------ |
| 17.1  | Batch profitability report   | `batches` + `cone_purchases` + `production_returns` + `invoices`  | Aggregation query API                      | Profitability chart/table    | [ ]    |
| 17.2  | Color profitability report   | `production_returns` + `invoices` grouped by color                | Aggregation query                          | Color profitability chart    | [ ]    |
| 17.3  | Weekly wage sheet            | `wage_cycles` + `wage_records`                                    | Wage sheet API per cycle                   | Printable wage sheet         | [ ]    |
| 17.4  | Wager damage % report        | `damage_records` / `production_returns` per wager                 | Damage ratio calculation                   | Damage % per wager table     | [ ]    |
| 17.5  | Capacity utilization report  | `production_returns` / (`loom_types.capacity` \* days - downtime) | Utilization % calculation                  | Utilization chart per wager  | [ ]    |
| 17.6  | Wager ranking                | Utilization % sorted                                              | Ranking API                                | Ranked wager list            | [ ]    |
| 17.7  | Cone stock report            | `inventory` WHERE stage='raw_cone' grouped by color, godown       | Stock summary query                        | Stock table with filters     | [ ]    |
| 17.8  | Finished stock by stage      | `inventory` grouped by stage                                      | Stage summary query                        | Stage-wise stock cards       | [ ]    |
| 17.9  | GST summary report           | `invoices` + `invoice_items` GST breakup                          | GST aggregation query                      | CGST/SGST/IGST summary table | [ ]    |
| 17.10 | Customer receivables aging   | `invoices` grouped by age bracket                                 | Aging query (0-30/30-60/60-90/90+)         | Aging bar chart + table      | [ ]    |
| 17.11 | Stock movement history       | `inventory_movements`                                             | Movement history query with filters        | Movement log table           | [ ]    |
| 17.12 | Downtime report              | `loom_downtimes` grouped by reason/loom/wager                     | Downtime aggregation query                 | Downtime breakdown chart     | [ ]    |
| 17.13 | Shift-wise production report | `production_returns` grouped by shift                             | Shift aggregation query (when enabled)     | Shift comparison chart       | [ ]    |
| 17.14 | Supplier ledger              | `cone_purchases` grouped by supplier                              | Supplier spend query                       | Supplier ledger table        | [ ]    |
| 17.15 | Revenue summary              | `invoices` + `payments`                                           | Revenue aggregation (daily/weekly/monthly) | Revenue chart                | [ ]    |

---

## Summary

| Category               | Checklist Items |
| ---------------------- | --------------- |
| Tenant Management      | 11              |
| Auth & Users           | 10              |
| Loom Management        | 6               |
| Product Master         | 11              |
| Suppliers & Customers  | 6               |
| Godowns                | 4               |
| Wager Profiles         | 5               |
| Batch System           | 5               |
| Inventory              | 9               |
| Production             | 11              |
| Damage                 | 7               |
| Tailoring & Packaging  | 7               |
| Wage & Advance         | 12              |
| Sales & Finance        | 15              |
| Notifications & Alerts | 8               |
| RLS & Security         | 6               |
| Reporting              | 15              |
| **Total**              | **148**         |
