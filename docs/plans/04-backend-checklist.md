# Backend Integration Checklist

## Purpose

This checklist validates that every Backend API endpoint correctly integrates with the Database schema and prepares proper responses for Frontend consumption. Cross-referenced with DB Checklist (02-database-checklist.md).

---

## CL-BE-01: Foundation & Middleware

| #    | Check Item                                | Backend Component         | DB Dependency            | DB Checklist Ref      | Status |
| ---- | ----------------------------------------- | ------------------------- | ------------------------ | --------------------- | ------ |
| 1.1  | Health check endpoint returns 200         | `GET /api/health`         | DB connection pool       | —                     | [ ]    |
| 1.2  | JWT token contains tenantId, userId, role | `authenticate` middleware | `users` table            | CL-DB-02.4            | [ ]    |
| 1.3  | Tenant isolation via RLS                  | `tenantScope` middleware  | `SET app.current_tenant` | CL-DB-16.2            | [ ]    |
| 1.4  | Role authorization (6 roles)              | `authorize()` middleware  | `users.role`             | CL-DB-02.4            | [ ]    |
| 1.5  | Staff permission checks                   | `requirePermission()`     | `staff_permissions`      | CL-DB-02.6            | [ ]    |
| 1.6  | Request validation (Zod)                  | `validate()` middleware   | —                        | —                     | [ ]    |
| 1.7  | Error response format                     | Error handler             | —                        | —                     | [ ]    |
| 1.8  | Audit logging on CRUD                     | `AuditService`            | `audit_logs`             | CL-DB-01.1 (implicit) | [ ]    |
| 1.9  | Transaction rollback on failure           | `withTransaction()`       | PostgreSQL transactions  | —                     | [ ]    |
| 1.10 | Base repository tenant scoping            | `BaseRepository<T>`       | `tenant_id` column       | CL-DB-16.1            | [ ]    |

---

## CL-BE-02: Authentication

| #    | Check Item                            | Backend Component       | DB Dependency                    | DB Checklist Ref | Status |
| ---- | ------------------------------------- | ----------------------- | -------------------------------- | ---------------- | ------ |
| 2.1  | OTP send → store hashed OTP           | `AuthService.sendOTP`   | `otp_codes`                      | CL-DB-02.1       | [ ]    |
| 2.2  | OTP verify → check hash + expiry      | `AuthService.verifyOTP` | `otp_codes`                      | CL-DB-02.1       | [ ]    |
| 2.3  | PIN verify → hash compare             | `AuthService.verifyPIN` | `users.pin_hash`                 | CL-DB-02.2       | [ ]    |
| 2.4  | PIN set/update → hash + store         | `AuthService.setPIN`    | `users.pin_hash`                 | CL-DB-02.2       | [ ]    |
| 2.5  | Auth method check per tenant          | Auth middleware         | `tenant_settings.auth_*_enabled` | CL-DB-01.7       | [ ]    |
| 2.6  | Inactive user blocked                 | Auth middleware         | `users.is_active`                | CL-DB-02.8       | [ ]    |
| 2.7  | Login response includes feature flags | `GET /api/auth/me`      | `tenant_settings`                | CL-DB-01.4-1.6   | [ ]    |
| 2.8  | User language in auth response        | `GET /api/auth/me`      | `users.language`                 | CL-DB-02.7       | [ ]    |
| 2.9  | Token refresh mechanism               | Auth refresh endpoint   | —                                | —                | [ ]    |
| 2.10 | OTP rate limiting                     | Rate limiter            | `otp_codes` count                | —                | [ ]    |

---

## CL-BE-03: Tenant & User Management

| #   | Check Item                           | Backend Component            | DB Dependency                    | DB Checklist Ref       | Status |
| --- | ------------------------------------ | ---------------------------- | -------------------------------- | ---------------------- | ------ |
| 3.1 | Create tenant → auto-create settings | `TenantService.create`       | `tenants`, `tenant_settings`     | CL-DB-01.1, CL-DB-01.3 | [ ]    |
| 3.2 | Tenant status toggle                 | `TenantService.updateStatus` | `tenants.status`                 | CL-DB-01.2             | [ ]    |
| 3.3 | Tenant settings update               | `TenantSettingsService`      | `tenant_settings` (all columns)  | CL-DB-01.3-1.10        | [ ]    |
| 3.4 | Create user with role                | `UserService.create`         | `users`                          | CL-DB-02.3             | [ ]    |
| 3.5 | Create wager → auto-create profile   | `UserService.create`         | `users`, `wager_profiles`        | CL-DB-02.3, CL-DB-07.5 | [ ]    |
| 3.6 | Unique phone per tenant              | `UserService.create`         | `users(tenant_id, phone)` UNIQUE | CL-DB-02.9             | [ ]    |
| 3.7 | Staff permission CRUD                | `PermissionService`          | `staff_permissions`              | CL-DB-02.5             | [ ]    |
| 3.8 | User deactivation (soft)             | `UserService.deactivate`     | `users.is_active`                | CL-DB-02.8             | [ ]    |

---

## CL-BE-04: Master Data

| #    | Check Item                      | Backend Component          | DB Dependency                   | DB Checklist Ref       | Status |
| ---- | ------------------------------- | -------------------------- | ------------------------------- | ---------------------- | ------ |
| 4.1  | Loom type CRUD + capacity       | `LoomTypeService`          | `loom_types`                    | CL-DB-03.1, CL-DB-03.2 | [ ]    |
| 4.2  | Loom CRUD + wager assignment    | `LoomService`              | `looms`                         | CL-DB-03.3, CL-DB-03.4 | [ ]    |
| 4.3  | Loom ownership validation       | `LoomService.assign`       | `looms.ownership`               | CL-DB-03.5             | [ ]    |
| 4.4  | Product CRUD (all fields)       | `ProductService`           | `products` (24+ columns)        | CL-DB-04.1-4.6         | [ ]    |
| 4.5  | Color price CRUD                | `ProductColorPriceService` | `product_color_prices`          | CL-DB-04.8             | [ ]    |
| 4.6  | Color price mode enforcement    | `ProductColorPriceService` | `products.color_pricing_mode`   | CL-DB-04.7, CL-DB-04.8 | [ ]    |
| 4.7  | Shift wage rate CRUD            | `ShiftWageRateService`     | `shift_wage_rates`              | CL-DB-04.9             | [ ]    |
| 4.8  | Shift rate feature flag check   | `ShiftWageRateService`     | `tenant_settings.shift_enabled` | CL-DB-01.5             | [ ]    |
| 4.9  | Supplier CRUD                   | `SupplierService`          | `suppliers`                     | CL-DB-05.1             | [ ]    |
| 4.10 | Customer CRUD + type validation | `CustomerService`          | `customers`                     | CL-DB-05.2, CL-DB-05.3 | [ ]    |
| 4.11 | Customer state_code for GST     | `CustomerService`          | `customers.state_code`          | CL-DB-05.6             | [ ]    |
| 4.12 | Godown CRUD + main constraint   | `GodownService`            | `godowns`                       | CL-DB-06.1, CL-DB-06.2 | [ ]    |
| 4.13 | Wager profile CRUD + type (1-4) | `WagerService`             | `wager_profiles`                | CL-DB-07.1, CL-DB-07.2 | [ ]    |
| 4.14 | Wager self-service read         | `GET /api/wagers/me`       | `wager_profiles` + RLS          | CL-DB-07.3             | [ ]    |

---

## CL-BE-05: Batch System

| #   | Check Item                                | Backend Component           | DB Dependency                   | DB Checklist Ref       | Status |
| --- | ----------------------------------------- | --------------------------- | ------------------------------- | ---------------------- | ------ |
| 5.1 | Batch CRUD (conditional on flag)          | `BatchService`              | `batches`                       | CL-DB-08.1             | [ ]    |
| 5.2 | Batch feature flag enforcement            | `BatchService`              | `tenant_settings.batch_enabled` | CL-DB-01.4, CL-DB-08.1 | [ ]    |
| 5.3 | Batch status lifecycle                    | `BatchService.updateStatus` | `batches.status`                | CL-DB-08.2             | [ ]    |
| 5.4 | Batch reopen from closed                  | `BatchService.reopen`       | `batches.status`                | CL-DB-08.3             | [ ]    |
| 5.5 | batch_id conditional in all creation APIs | All transactional services  | All tables with batch_id FK     | CL-DB-08.4             | [ ]    |

---

## CL-BE-06: Inventory & Raw Materials

| #    | Check Item                           | Backend Component               | DB Dependency                                        | DB Checklist Ref | Status |
| ---- | ------------------------------------ | ------------------------------- | ---------------------------------------------------- | ---------------- | ------ |
| 6.1  | Cone purchase → inventory (raw_cone) | `ConePurchaseService`           | `cone_purchases`, `inventory`, `inventory_movements` | CL-DB-09.1       | [ ]    |
| 6.2  | Total cost auto-calc                 | `ConePurchaseService`           | `cone_purchases.total_cost`                          | CL-DB-09.1       | [ ]    |
| 6.3  | GST amount auto-calc                 | `ConePurchaseService`           | `cone_purchases.gst_amount`                          | CL-DB-09.1       | [ ]    |
| 6.4  | Inventory query by dimensions        | `InventoryService.query`        | `inventory` (5-dimensional unique)                   | CL-DB-09.2       | [ ]    |
| 6.5  | Inventory stage summary              | `InventoryService.summary`      | `inventory.stage`                                    | CL-DB-09.3       | [ ]    |
| 6.6  | Stage transition APIs                | `InventoryService.transition`   | `inventory.stage`                                    | CL-DB-09.4       | [ ]    |
| 6.7  | Movement history                     | `InventoryService.movements`    | `inventory_movements`                                | CL-DB-09.5       | [ ]    |
| 6.8  | Inter-godown transfer (conditional)  | `TransferService`               | `inter_godown_transfers`, `inventory`                | CL-DB-09.6       | [ ]    |
| 6.9  | Transfer feature flag check          | `TransferService`               | `tenant_settings.inter_godown_transfer_enabled`      | CL-DB-01.6       | [ ]    |
| 6.10 | Transfer src != dest validation      | `TransferService`               | `inter_godown_transfers`                             | CL-DB-09.6       | [ ]    |
| 6.11 | Transfer inventory atomicity         | `TransferService` (transaction) | `inventory` (2 rows)                                 | CL-DB-09.6       | [ ]    |

---

## CL-BE-07: Production System

| #    | Check Item                                  | Backend Component                                   | DB Dependency                                                                 | DB Checklist Ref       | Status |
| ---- | ------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------- | ------ |
| 7.1  | Cone issuance → raw_cone inventory decrease | `ConeIssuanceService`                               | `cone_issuances`, `inventory`                                                 | CL-DB-10.1             | [ ]    |
| 7.2  | Insufficient stock check                    | `ConeIssuanceService`                               | `inventory.quantity`                                                          | CL-DB-10.1             | [ ]    |
| 7.3  | Paavu production → inventory transition     | `PaavuProductionService`                            | `paavu_productions`, `inventory`                                              | CL-DB-10.2             | [ ]    |
| 7.4  | Paavu wastage flag auto-set                 | `PaavuProductionService`                            | `paavu_productions.wastage_flag`, `tenant_settings.paavu_wastage_limit_grams` | CL-DB-10.3             | [ ]    |
| 7.5  | Production return (Type 1/3 weight-based)   | `ProductionReturnService`                           | `production_returns.return_weight_kg`                                         | CL-DB-10.4             | [ ]    |
| 7.6  | Production return (Type 2/4 count-based)    | `ProductionReturnService`                           | `production_returns.return_count`                                             | CL-DB-10.5             | [ ]    |
| 7.7  | Return → woven inventory increase           | `ProductionReturnService`                           | `inventory` (stage=woven)                                                     | CL-DB-10.4, CL-DB-10.5 | [ ]    |
| 7.8  | Wastage validation per wager type           | `ProductionReturnService`                           | `production_returns.wastage_grams`                                            | CL-DB-10.7             | [ ]    |
| 7.9  | Shift-based return (conditional)            | `ProductionReturnService`                           | `production_returns.shift`                                                    | CL-DB-10.6             | [ ]    |
| 7.10 | Color substitution → fraud alert            | `ProductionReturnService` → `FraudDetectionService` | `fraud_alerts`                                                                | CL-DB-15.6             | [ ]    |
| 7.11 | Loom downtime CRUD                          | `DowntimeService`                                   | `loom_downtimes`                                                              | CL-DB-10.8             | [ ]    |
| 7.12 | Downtime by owner OR wager                  | `DowntimeService`                                   | `loom_downtimes.reported_by`                                                  | CL-DB-10.8             | [ ]    |
| 7.13 | Shift CRUD (conditional)                    | `ShiftService`                                      | `shifts`                                                                      | CL-DB-10.10            | [ ]    |
| 7.14 | Performance calculation                     | `PerformanceService`                                | `production_returns` + `loom_types` + `loom_downtimes`                        | CL-DB-10.11            | [ ]    |
| 7.15 | Ranking visibility control                  | `PerformanceService`                                | `tenant_settings.show_wager_ranking`                                          | CL-DB-01.10            | [ ]    |

---

## CL-BE-08: Damage Management

| #   | Check Item                          | Backend Component       | DB Dependency                                                        | DB Checklist Ref | Status |
| --- | ----------------------------------- | ----------------------- | -------------------------------------------------------------------- | ---------------- | ------ |
| 8.1 | Damage record creation              | `DamageService`         | `damage_records`                                                     | CL-DB-11.1       | [ ]    |
| 8.2 | 4 detection points validated        | `DamageService`         | `damage_records.detection_point`                                     | CL-DB-11.1       | [ ]    |
| 8.3 | 3 grade levels validated            | `DamageService`         | `damage_records.grade`                                               | CL-DB-11.2       | [ ]    |
| 8.4 | Deduction rate from tenant settings | `DamageService`         | `tenant_settings.damage_*_pct` → `damage_records.deduction_rate_pct` | CL-DB-11.7       | [ ]    |
| 8.5 | Total deduction auto-calculated     | `DamageService`         | `damage_records.total_deduction`                                     | CL-DB-11.3       | [ ]    |
| 8.6 | Owner approval workflow             | `DamageApprovalService` | `damage_records.approval_status`                                     | CL-DB-11.4       | [ ]    |
| 8.7 | Miscellaneous damage handling       | `DamageService`         | `damage_records.is_miscellaneous`                                    | CL-DB-11.5       | [ ]    |
| 8.8 | Wager traceability                  | `DamageService`         | `damage_records.wager_id` → `production_returns`                     | CL-DB-11.6       | [ ]    |
| 8.9 | Wager sees only own damage          | RLS / query filter      | `damage_records` + RLS                                               | CL-DB-11.1       | [ ]    |

---

## CL-BE-09: Tailoring & Packaging

| #    | Check Item                    | Backend Component                | DB Dependency                                                       | DB Checklist Ref | Status |
| ---- | ----------------------------- | -------------------------------- | ------------------------------------------------------------------- | ---------------- | ------ |
| 9.1  | Tailoring record creation     | `TailoringService`               | `tailoring_records`                                                 | CL-DB-12.1       | [ ]    |
| 9.2  | Stitch wage auto-calc         | `TailoringService`               | `products.stitch_rate_per_piece` → `tailoring_records.stitch_wage`  | CL-DB-12.2       | [ ]    |
| 9.3  | Knot wage auto-calc           | `TailoringService`               | `products.knot_rate_per_piece` → `tailoring_records.knot_wage`      | CL-DB-12.2       | [ ]    |
| 9.4  | Total tailor wage             | `TailoringService`               | `tailoring_records.total_wage`                                      | CL-DB-12.2       | [ ]    |
| 9.5  | Woven → tailored transition   | `TailoringService` (transaction) | `inventory.stage`                                                   | CL-DB-12.7       | [ ]    |
| 9.6  | Mismatch detection            | `TailoringService`               | `tailoring_records.mismatch_flag`                                   | CL-DB-12.3       | [ ]    |
| 9.7  | Packaging record creation     | `PackagingService`               | `packaging_records`                                                 | CL-DB-12.4       | [ ]    |
| 9.8  | Bundle type → pieces lookup   | `PackagingService`               | `products.small_bundle_count/large_bundle_count`                    | CL-DB-12.6       | [ ]    |
| 9.9  | Packager wage auto-calc       | `PackagingService`               | `products.bundle_rate_small/large` → `packaging_records.total_wage` | CL-DB-12.5       | [ ]    |
| 9.10 | Tailored → bundled transition | `PackagingService` (transaction) | `inventory.stage`                                                   | CL-DB-12.7       | [ ]    |

---

## CL-BE-10: Wage & Advance

| #     | Check Item                                | Backend Component                     | DB Dependency                                            | DB Checklist Ref       | Status |
| ----- | ----------------------------------------- | ------------------------------------- | -------------------------------------------------------- | ---------------------- | ------ |
| 10.1  | Advance issuance                          | `AdvanceService`                      | `advance_transactions`, `wager_profiles.advance_balance` | CL-DB-13.1, CL-DB-13.2 | [ ]    |
| 10.2  | Balance_after snapshot                    | `AdvanceService`                      | `advance_transactions.balance_after`                     | CL-DB-13.2             | [ ]    |
| 10.3  | Wage cycle generation                     | `WageCycleService.generate`           | `wage_cycles`, `wage_records`                            | CL-DB-13.3             | [ ]    |
| 10.4  | Cycle date range (weekly)                 | `WageCycleService`                    | `wage_cycles.cycle_start_date/end_date`                  | CL-DB-13.3             | [ ]    |
| 10.5  | Wager gross wage (per kg for Type 1/3)    | `WageCycleService`                    | `production_returns` \* `products.wage_rate_per_kg`      | CL-DB-13.5             | [ ]    |
| 10.6  | Wager gross wage (per piece for Type 2/4) | `WageCycleService`                    | `production_returns` \* `products.wage_rate_per_piece`   | CL-DB-13.5             | [ ]    |
| 10.7  | Shift-specific wage rates                 | `WageCycleService`                    | `shift_wage_rates`                                       | CL-DB-13.5             | [ ]    |
| 10.8  | Tailor gross wage calc                    | `WageCycleService`                    | `tailoring_records.total_wage`                           | CL-DB-13.5             | [ ]    |
| 10.9  | Packager gross wage calc                  | `WageCycleService`                    | `packaging_records.total_wage`                           | CL-DB-13.5             | [ ]    |
| 10.10 | Paavu Oati gross wage calc                | `WageCycleService`                    | `paavu_productions.paavu_count` \* rate                  | CL-DB-13.5             | [ ]    |
| 10.11 | Advance deduction                         | `WageCycleService`                    | `wage_records.advance_deduction`                         | CL-DB-13.6             | [ ]    |
| 10.12 | Damage deduction                          | `WageCycleService`                    | `wage_records.damage_deduction`                          | CL-DB-13.7             | [ ]    |
| 10.13 | Net payable formula                       | `WageCycleService`                    | `wage_records.net_payable`                               | CL-DB-13.8             | [ ]    |
| 10.14 | Discretionary payment                     | `WageCycleService`                    | `wage_records.discretionary_amount`                      | CL-DB-13.9             | [ ]    |
| 10.15 | Discretionary → advance balance           | `WageCycleService` + `AdvanceService` | `advance_transactions`                                   | CL-DB-13.10            | [ ]    |
| 10.16 | Cycle status workflow                     | `WageCycleService`                    | `wage_cycles.status`                                     | CL-DB-13.4             | [ ]    |
| 10.17 | All 4 worker types                        | `WageCycleService`                    | `wage_records.worker_type`                               | CL-DB-13.11            | [ ]    |
| 10.18 | Wager self-service wage view              | `GET /api/wagers/me/wages`            | `wage_records` + RLS                                     | CL-DB-13.12            | [ ]    |

---

## CL-BE-11: Sales & Finance

| #     | Check Item                            | Backend Component              | DB Dependency                                | DB Checklist Ref       | Status |
| ----- | ------------------------------------- | ------------------------------ | -------------------------------------------- | ---------------------- | ------ |
| 11.1  | Invoice creation + auto number        | `InvoiceService`               | `invoices`, `invoice_items`                  | CL-DB-14.1, CL-DB-14.2 | [ ]    |
| 11.2  | GST auto-detection (intra/inter)      | `InvoiceService`               | `tenants.state_code`, `customers.state_code` | CL-DB-14.3             | [ ]    |
| 11.3  | CGST + SGST split                     | `InvoiceService`               | `invoices.cgst_amount`, `sgst_amount`        | CL-DB-14.4             | [ ]    |
| 11.4  | IGST calculation                      | `InvoiceService`               | `invoices.igst_amount`                       | CL-DB-14.5             | [ ]    |
| 11.5  | Due date calculation                  | `InvoiceService`               | `invoices.due_date`                          | CL-DB-14.6             | [ ]    |
| 11.6  | Invoice status management             | `InvoiceService`               | `invoices.status`                            | CL-DB-14.7             | [ ]    |
| 11.7  | Payment recording                     | `PaymentService`               | `payments`                                   | CL-DB-14.8             | [ ]    |
| 11.8  | Payment → invoice balance update      | `PaymentService` (transaction) | `invoices.amount_paid/balance_due`           | CL-DB-14.9             | [ ]    |
| 11.9  | Payment → customer balance update     | `PaymentService` (transaction) | `customers.outstanding_balance`              | CL-DB-14.10            | [ ]    |
| 11.10 | Overdue detection                     | `OverdueService`               | `invoices.due_date/balance_due`              | CL-DB-14.11            | [ ]    |
| 11.11 | E-way bill JSON export                | `EwayBillService`              | `invoices.eway_bill_number`                  | CL-DB-14.12            | [ ]    |
| 11.12 | Payment aging report                  | `AgingReportService`           | `invoices` age bucketing                     | CL-DB-14.13            | [ ]    |
| 11.13 | Payment method validation             | `PaymentService`               | `payments.payment_method`                    | CL-DB-14.14            | [ ]    |
| 11.14 | Inventory → sold stage                | `InvoiceService` (transaction) | `inventory.stage`                            | CL-DB-14.15            | [ ]    |
| 11.15 | Bill-to-bill full payment enforcement | `PaymentService`               | `customers.customer_type`                    | CL-DB-05.3             | [ ]    |

---

## CL-BE-12: Notifications & Alerts

| #    | Check Item                 | Backend Component            | DB Dependency              | DB Checklist Ref | Status |
| ---- | -------------------------- | ---------------------------- | -------------------------- | ---------------- | ------ |
| 12.1 | Notification CRUD          | `NotificationService`        | `notifications`            | CL-DB-15.1       | [ ]    |
| 12.2 | Read/unread management     | `NotificationService`        | `notifications.is_read`    | CL-DB-15.2       | [ ]    |
| 12.3 | User-scoped notifications  | RLS / query filter           | `notifications.user_id`    | CL-DB-15.4       | [ ]    |
| 12.4 | 11 event triggers          | `NotificationTriggerService` | `notifications`            | CL-DB-15.1       | [ ]    |
| 12.5 | FCM push integration       | `PushNotificationService`    | `notifications` → FCM      | CL-DB-15.5       | [ ]    |
| 12.6 | 7 fraud alert types        | `FraudDetectionService`      | `fraud_alerts`             | CL-DB-15.6       | [ ]    |
| 12.7 | Fraud alert access control | Authorization middleware     | `fraud_alerts` + RLS       | CL-DB-15.8       | [ ]    |
| 12.8 | Fraud alert resolution     | `FraudAlertService`          | `fraud_alerts.is_resolved` | CL-DB-15.7       | [ ]    |

---

## CL-BE-13: Reports

| #     | Check Item                                | Backend Component          | DB Dependency                           | DB Checklist Ref | Status |
| ----- | ----------------------------------------- | -------------------------- | --------------------------------------- | ---------------- | ------ |
| 13.1  | Production summary (daily/weekly/monthly) | `ProductionReportService`  | `production_returns` aggregated         | CL-DB-17.1       | [ ]    |
| 13.2  | Batch profitability                       | `ProductionReportService`  | Multiple tables                         | CL-DB-17.1       | [ ]    |
| 13.3  | Color profitability                       | `ProductionReportService`  | `production_returns` + `invoices`       | CL-DB-17.2       | [ ]    |
| 13.4  | Weekly wage sheet                         | `WagerReportService`       | `wage_cycles` + `wage_records`          | CL-DB-17.3       | [ ]    |
| 13.5  | Wager damage %                            | `WagerReportService`       | `damage_records` / `production_returns` | CL-DB-17.4       | [ ]    |
| 13.6  | Capacity utilization                      | `WagerReportService`       | Computed from multiple tables           | CL-DB-17.5       | [ ]    |
| 13.7  | Wager ranking                             | `WagerReportService`       | Utilization sorted                      | CL-DB-17.6       | [ ]    |
| 13.8  | Cone stock report                         | `InventoryReportService`   | `inventory` (stage=raw_cone)            | CL-DB-17.7       | [ ]    |
| 13.9  | Finished stock by stage                   | `InventoryReportService`   | `inventory` grouped by stage            | CL-DB-17.8       | [ ]    |
| 13.10 | GST summary                               | `FinanceReportService`     | `invoices` + `invoice_items`            | CL-DB-17.9       | [ ]    |
| 13.11 | Customer aging                            | `FinanceReportService`     | `invoices` age bucketing                | CL-DB-17.10      | [ ]    |
| 13.12 | Stock movement                            | `InventoryReportService`   | `inventory_movements`                   | CL-DB-17.11      | [ ]    |
| 13.13 | Downtime report                           | `PerformanceReportService` | `loom_downtimes`                        | CL-DB-17.12      | [ ]    |
| 13.14 | Shift-wise production                     | `PerformanceReportService` | `production_returns` (shift)            | CL-DB-17.13      | [ ]    |
| 13.15 | Supplier ledger                           | `FinanceReportService`     | `cone_purchases`                        | CL-DB-17.14      | [ ]    |
| 13.16 | Revenue summary (daily/weekly/monthly)    | `FinanceReportService`     | `invoices` + `payments` aggregated      | CL-DB-17.15      | [ ]    |

---

## Summary

| Category                  | Checklist Items |
| ------------------------- | --------------- |
| Foundation & Middleware   | 10              |
| Authentication            | 10              |
| Tenant & User Management  | 8               |
| Master Data               | 14              |
| Batch System              | 5               |
| Inventory & Raw Materials | 11              |
| Production System         | 15              |
| Damage Management         | 9               |
| Tailoring & Packaging     | 10              |
| Wage & Advance            | 18              |
| Sales & Finance           | 15              |
| Notifications & Alerts    | 8               |
| Reports                   | 16              |
| **Total**                 | **149**         |
