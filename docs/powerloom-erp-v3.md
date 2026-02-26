---
# Powerloom Production ERP System — V3

### Multi-Tenant | Batch-Optional | Manufacturing + Wage + GST ERP

### Web + Mobile (React Native) | English + Tamil
---

# Table of Contents

1. [Industry Overview](#industry-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Multi-Tenancy Model](#multi-tenancy-model)
4. [Authentication & User Roles](#authentication--user-roles)
5. [Core Textile Terminology](#core-textile-terminology)
6. [Types of Powerlooms](#types-of-powerlooms)
7. [Product Master Configuration](#product-master-configuration)
8. [People Involved in the Ecosystem](#people-involved-in-the-ecosystem)
9. [Types of Wagers](#types-of-wagers)
10. [Batch System (Optional per Tenant)](#batch-system-optional-per-tenant)
11. [Raw Material & Inventory Management](#raw-material--inventory-management)
12. [Stock Stage Tracking](#stock-stage-tracking)
13. [Paavu Pattarai (Warp Unit)](#paavu-pattarai-warp-unit)
14. [Wager Production System](#wager-production-system)
15. [Damage Management & Grading System](#damage-management--grading-system)
16. [Tailoring Process](#tailoring-process)
17. [Packaging Process](#packaging-process)
18. [Sales (Wholesale & Retail) + GST](#sales-wholesale--retail--gst)
19. [Advance & Wage Management System](#advance--wage-management-system)
20. [Shift-Based Production (Optional)](#shift-based-production-optional)
21. [Loom Capacity & Performance Intelligence](#loom-capacity--performance-intelligence)
22. [Loss & Fraud Detection Engine](#loss--fraud-detection-engine)
23. [Multi-Godown Management](#multi-godown-management)
24. [Notification System](#notification-system)
25. [Multi-Language Architecture](#multi-language-architecture)
26. [Reports & Analytics Dashboard](#reports--analytics-dashboard)
27. [UX Principles](#ux-principles)
28. [System Completeness Status](#system-completeness-status)

---

# Industry Overview

This ERP system is designed for:

- Powerloom Owners / Wholesalers
- Textile micro-manufacturing clusters
- Batch-based (or non-batch) textile manufacturing

It supports:

- Multi-tenant SaaS architecture
- Web app + Native mobile app (iOS & Android)
- Optional batch-level traceability
- Wage automation with advance management
- Damage recovery with grading
- GST invoice system (CGST/SGST & IGST)
- Optional E-way bill support

Customers may include:

- Wholesale buyers (primary)
- Retail buyers (occasional direct sales)

---

# Architecture & Tech Stack

## Platform

| Layer              | Technology                          | Notes                                             |
| ------------------ | ----------------------------------- | ------------------------------------------------- |
| Web App            | Next.js (React)                     | Server-side rendering, SEO-friendly               |
| Mobile App         | React Native (Expo)                 | Single codebase for iOS + Android                 |
| Backend API        | Node.js / TypeScript                | Shared API for web + mobile                       |
| Database           | PostgreSQL                          | Shared DB with row-level tenant isolation         |
| Authentication     | Phone OTP + Optional PIN            | OTP via SMS; PIN as offline fallback              |
| Push Notifications | Firebase Cloud Messaging (FCM)      | Free tier — iOS + Android + Web                   |
| File Storage       | S3-compatible (e.g., Cloudflare R2) | Invoices, reports, exports                        |
| Hosting            | Free/low-cost tiers preferred       | Vercel (web), Railway/Render (API), Supabase (DB) |

## Key Principles

- Free-tier friendly tooling wherever possible
- Shared TypeScript codebase between web and mobile where feasible
- RESTful API (or tRPC) consumed by both web and mobile clients
- Translation key-based i18n architecture from day one

---

# Multi-Tenancy Model

**Approach**: Shared database with `tenant_id` row-level filtering.

Every table includes a `tenant_id` column. All queries are scoped by tenant.

Benefits:

- Single database to manage
- Lower infrastructure cost
- Easy to onboard new tenants
- Simpler backups and migrations

Security:

- Row-Level Security (RLS) policies at the database level
- API middleware enforces tenant scoping on every request
- No tenant can access another tenant's data

---

# Authentication & User Roles

## Authentication Methods

Users can authenticate via two methods (tenant-configurable):

1. **Phone OTP (Primary)** — User enters mobile number, receives OTP via SMS, verifies to login. No password to remember.
2. **Phone + 4-digit PIN (Fallback)** — User sets a 4-digit PIN during onboarding. Login via mobile number + PIN. Useful when SMS delivery is unreliable.

Tenants can enable one or both methods.

## User Roles

### Role Hierarchy

| Role              | Access Level                         | Description                                                      |
| ----------------- | ------------------------------------ | ---------------------------------------------------------------- |
| **Super Admin**   | Platform-wide                        | System operator (manages tenants, billing, platform settings)    |
| **Owner / Admin** | Full tenant access                   | Powerloom owner — full control over all modules                  |
| **Staff**         | Configurable permissions             | Employees like godown manager, accountant — role-based access    |
| **Wager**         | Self-service (read-only on own data) | View own production, returns, wages, advances, damage deductions |
| **Tailor**        | Self-service (read-only on own data) | View own stitch/knot counts and wages                            |
| **Packager**      | Self-service (read-only on own data) | View own bundling counts and wages                               |

### Staff Permission System

Owner can create staff users and assign granular permissions:

- Godown management (stock view, transfers)
- Production entry (cone issue, production return)
- Wage processing (view, calculate, approve)
- Sales & invoicing
- Reports (specific report groups)
- Damage approval
- Master data management (products, looms, wagers)

---

# Core Textile Terminology

## Paavu

Long running threads of the woven fabric (length direction).

## Oodai

Cross threads of the woven fabric (width direction).

Example:
Product size = 30 x 60 inches

- 60 inches = Paavu
- 30 inches = Oodai

---

# Types of Powerlooms

Capacity is defined **per powerloom type**, not per individual loom.

| Loom Type           | Nickname          | Description                    |
| ------------------- | ----------------- | ------------------------------ |
| Single Lengthy Loom | Single            | Produces single-length fabrics |
| Double Lengthy Loom | Box               | Produces double-length fabrics |
| Triple Length Loom  | Air Loom / Rapier | Produces triple-length fabrics |
| Future Types        | —                 | Expandable                     |

Each loom record contains:

- Loom ID
- Loom Type
- Assigned Wager
- Maintenance status
- Active / Inactive status

Capacity (pieces/day) is stored at the **loom type** level and used for performance calculations.

---

# Product Master Configuration

Each product includes:

- Product Name (Khadi, Jakkadu, etc.)
- Size (30x60, 27x54, 40x80, etc.)
- Category (Single / Double / Triple / Quad)
- **Paavu-to-piece ratio** (configured per product)
- Paavu consumption per piece (grams)
- Paavu wastage (grams or %)
- Oodai consumption per piece (grams)
- Oodai wastage (grams or %)
- Wage rate per kg
- Wage rate per piece
- Stitch rate (per piece — for tailors)
- Knot rate (per piece — for tailors)
- Bundle configuration (small bundle count & large bundle count)
- Optional color-wise selling price

### Color Pricing Modes

- **Mode 1 (Default)**: Average price for multi-color bundles
- **Mode 2 (Optional)**: Different selling price per color

---

# People Involved in the Ecosystem

## 1. Owner / Wholesaler

- Purchases cones
- Creates batches (if enabled)
- Approves damage deductions
- Pays wages
- Manages customers
- Controls performance visibility
- Configures tenant settings

## 2. Wagers (Powerloom Operators)

Operate powerlooms and produce woven fabrics. Have self-service login to view their own data.

## 3. Paavu Oati

Prepare warp (Paavu) in Paavu Pattarai. Paid **per Paavu count** produced.

## 4. Tailors

Stitch & knot woven fabrics. Paid **per stitch count and per knot count**.

## 5. Packagers

Bundle finished products. Paid **per bundle** (small or large).

## 6. Transport Operators

Deliver goods to customers.

## 7. Suppliers (Cotton Mills)

Supply cone threads.

## 8. Customers

- Wholesale buyers (primary)
- Retail buyers (occasional)

---

# Types of Wagers

| Type   | Loom Ownership | Work Done     |
| ------ | -------------- | ------------- |
| Type 1 | Own Loom       | Paavu + Oodai |
| Type 2 | Own Loom       | Oodai only    |
| Type 3 | Owner's Loom   | Paavu + Oodai |
| Type 4 | Owner's Loom   | Oodai only    |

### Return Logic

- Type 1 & 3 → Weight mandatory, count optional → **Wage based on weight (per kg)**
- Type 2 & 4 → Count mandatory, weight optional → **Wage based on count (per piece)**

---

# Batch System (Optional per Tenant)

Batching is a **tenant-level toggle** in settings.

## Batch ON Mode

Every production cycle belongs to a Batch.

Batch includes:

- Batch ID (auto-generated)
- Product
- Color
- Size
- Target quantity
- Status (Open / In Progress / Closed)
- Tenant ID

All operations (cone issue, paavu, production, tailoring, packaging, sale) link to Batch ID.

Closed batches **can be reopened** by the owner.
Products from closed batches **can still be sold**.

### Wager & Batch Relationship

- A wager **can work on multiple batches** simultaneously.
- A single cone issuance **should be linked to one batch** for traceability. If a wager needs material for multiple batches, separate issuances are created per batch.

Benefits:

- Full traceability: cone → paavu → product → sale
- Batch profitability analysis
- Fraud detection per batch
- Wager performance comparison per batch

## Batch OFF Mode

- No batch linkage required for any operation
- Cone issuance, production, and sales work independently
- Simplified flow — fewer fields to fill
- Profitability tracked at product/color level instead of batch level
- All batch-related fields become hidden in the UI

---

# Raw Material & Inventory Management

## Cone Purchase

Each purchase record includes:

- Bale ID (Optional — may not always exist)
- Supplier
- Color
- Weight (60kg standard per bale)
- Cost per kg
- GST details
- Batch ID (if batching enabled)

## Wastage Rules

| Wager Type     | Allowed Wastage per 60kg               |
| -------------- | -------------------------------------- |
| Type 1 & 3     | 1 kg                                   |
| Type 2 & 4     | 500 g                                  |
| Paavu Pattarai | Configurable constant (tenant setting) |

## Inventory Tracking Dimensions

Stock tracked by:

**Godown + Product + Color + Stage + Batch (if enabled)**

---

# Stock Stage Tracking

Inventory is tracked at every stage of the production flow:

| Stage             | Description                                      | Stock Unit                   |
| ----------------- | ------------------------------------------------ | ---------------------------- |
| **Raw (Cone)**    | Cotton cones purchased from supplier             | Weight (kg)                  |
| **Paavu**         | Warp threads prepared in Paavu Pattarai          | Count (number of Paavus)     |
| **Woven (Loose)** | Woven pieces returned from wager, pre-inspection | Count (pieces) + Weight (kg) |
| **Tailored**      | Pieces after stitching and knotting              | Count (pieces)               |
| **Bundled**       | Pieces packed into small/large bundles           | Count (bundles)              |
| **Sold**          | Dispatched to customer                           | Count (pieces/bundles)       |

### UX for Stage Transitions

Stage transitions should be **one-tap actions** wherever possible:

- "Received from wager" → auto-moves to Woven stage
- "Sent to tailor" / "Received from tailor" → moves to Tailored
- "Packed" → moves to Bundled
- "Invoiced & dispatched" → moves to Sold

System auto-calculates quantities where possible to minimize manual entry.

---

# Paavu Pattarai (Warp Unit)

- Cone issued (batch-wise if batching enabled)
- Paavu count produced is recorded
- Wastage monitored against configurable limit
- **Weekly wage calculated = Paavu count x rate per Paavu**
- Inventory updated (Cone stock decreases, Paavu stock increases)

Loss flagged if wastage exceeds allowed limit.

---

# Wager Production System

## Type 1 & 3 (Weight-based)

- Return by weight (mandatory)
- Count tracking (optional)
- Wage = Weight returned x Rate per kg

## Type 2 & 4 (Count-based)

- Return by count (mandatory)
- Weight tracking (optional)
- Wage = Count returned x Rate per piece

## System Validations

- Expected weight return (based on cotton issued minus allowed wastage)
- Paavu-to-piece ratio check (per product master)
- Wastage within allowed limit
- Damage percentage within threshold

All linked to Batch (if batching enabled).

---

# Damage Management & Grading System

## Detection Points

Damage may be detected at:

- Inspection (post-wager return)
- Tailoring
- Packaging
- Customer return

## Damage Grades

| Grade      | Description                       | Deduction Rate                    |
| ---------- | --------------------------------- | --------------------------------- |
| **Minor**  | Small defect, still usable        | Configurable % of production cost |
| **Major**  | Significant defect, reduced value | Configurable % of production cost |
| **Reject** | Unusable, full loss               | 100% of production cost           |

Deduction rates are configurable per tenant.

## Damage Flow

1. Damage recorded (grade + count + detection point)
2. **Owner approval required** before deduction is applied
3. Damage return note generated
4. Deduction applied to wager's wage

### Deduction Formula

Damage Count x Production Cost per Piece x Grade Deduction Rate

Production cost includes:

- Material cost (cotton)
- Wage cost

No profit margin included in production cost.

## Traceability

- Damage traced back to original wager **indefinitely** via production records / batch records
- If the wager **cannot be identified**, damage is categorized as **"Miscellaneous"**
  - No wager deduction applied
  - Owner absorbs the cost
  - Tracked separately for reporting

---

# Tailoring Process

Tracks:

- Stitch count (per piece)
- Knot count (per piece)
- Batch linkage (if enabled)

Mismatch detection: system flags if stitch/knot count doesn't match woven stock received.

### Tailor Wage

- Stitch wage = Stitch count x Stitch rate (from product master)
- Knot wage = Knot count x Knot rate (from product master)
- Total tailor wage = Stitch wage + Knot wage

---

# Packaging Process

Two bundle types:

- **Small bundle** — count per bundle defined in product master
- **Large bundle** — count per bundle defined in product master

Stock converted from loose/tailored to bundled.

### Packager Wage

- Wage = Bundle count x Rate per bundle (configurable per bundle type)

---

# Sales (Wholesale & Retail) + GST

## Customer Types

| Type                            | Payment Model                     | Description                         |
| ------------------------------- | --------------------------------- | ----------------------------------- |
| **Wholesale (Partial Payment)** | Partial payments against invoices | Can pay any amount, balance tracked |
| **Wholesale (Bill-to-Bill)**    | Full invoice settlement           | Pays full amount per invoice        |
| **Retail**                      | Immediate / Cash                  | Occasional direct buyers            |

## Credit Management

- Credit period: **Configurable per customer** (default: 30 days)
- System tracks outstanding balance per customer
- **Notifications triggered**:
  - Approaching due date (configurable days before)
  - On due date
  - Overdue (daily/weekly reminders)

## Invoicing

- Sale per piece
- Multi-color bundle pricing (Mode 1: average, Mode 2: per-color)
- GST invoice generation

### GST Handling

System automatically determines tax type based on location:

- **Intra-state** (customer state = tenant state): CGST + SGST
- **Inter-state** (customer state ≠ tenant state): IGST

GST rate is **configurable per product**.

- Optional E-way bill JSON export (for consignments above threshold)

## Payment Tracking

- Partial payments recorded against specific invoices
- Payment history maintained per customer
- Outstanding balance calculated in real-time
- Aging report: 0-30, 30-60, 60-90, 90+ days

---

# Advance & Wage Management System

## Advance System

Wagers may receive advance amounts (e.g., Rs.40,000).

Advance is tracked as a running balance.

## Weekly Wage Calculation

Wage cycle day is **configurable per tenant** (e.g., every Sunday, every Saturday).

```
Gross Wage (production-based)
– Advance Deduction (configurable amount per week)
– Damage Deduction (approved damages for the week)
= Net Payable
```

### Negative Balance Handling

If net payable becomes **zero or negative**:

- Owner **can still choose to pay** the wager a discretionary amount
- The paid amount is added to the advance balance
- This additional advance is **deducted gradually** in upcoming weeks
- System tracks: original advance + additional advances separately for clarity

### Wage Cycle

- Auto-generated on the configured day
- Owner reviews and approves before payout
- Wager can view their wage breakdown via self-service login

---

# Shift-Based Production (Optional)

Tenant-level setting: **Enable Shift Tracking? (Yes / No)**

If enabled:

| Shift   | Example Timing |
| ------- | -------------- |
| Morning | 6 AM – 2 PM    |
| Evening | 2 PM – 10 PM   |
| Night   | 10 PM – 6 AM   |

Shift timings are configurable per tenant.

### Shift Impact on Wages

- **Wage rates can differ per shift** (e.g., night shift premium)
- Shift-wise wage rates configured in product master or tenant settings
- Production tracked per shift for performance analysis

---

# Loom Capacity & Performance Intelligence

## Capacity Definition

Capacity is defined **per loom type** (not per individual loom).

Example: Double Lengthy Loom = 50 pieces/day

## Expected Production Calculation

```
Expected Production = Loom Type Capacity x Working Days
```

If downtime is recorded:

```
Adjusted Expected Production = Loom Type Capacity x (Working Days – Downtime Days)
```

## Downtime Recording

Downtime can be recorded by **both wager and owner**.

Downtime reasons:

- Maintenance / Repair
- Electricity failure
- Leave / Absence
- Other (configurable)

## Wager Performance Ranking

```
Capacity Utilization % = (Actual Production / Adjusted Expected Production) x 100
```

Ranking generated across all wagers in the tenant.

### Visibility Control

Owner can configure:

- **Show ranking to wagers** — Wagers see their rank and utilization %
- **Hide ranking from wagers** — Only owner/staff can see rankings

---

# Loss & Fraud Detection Engine

System flags anomalies:

| Alert              | Trigger                                           |
| ------------------ | ------------------------------------------------- |
| Color substitution | Returned color doesn't match issued color         |
| Excess wastage     | Wastage exceeds allowed limit per wager type      |
| Underproduction    | Actual production significantly below expected    |
| High damage %      | Damage rate exceeds configurable threshold        |
| Loom inefficiency  | Capacity utilization below configurable threshold |
| Inventory mismatch | Physical stock vs system stock discrepancy        |
| Customer overdue   | Payment past credit period                        |

Alerts visible to Owner and authorized Staff only.

---

# Multi-Godown Management

Each tenant can manage:

- Main godown
- Additional godowns (unlimited)
- Paavu Pattarai location(s)

Stock tracked per:

**Godown + Product + Color + Stage + Batch (if enabled)**

## Inter-Godown Transfers (Optional)

- Tenants can enable/disable inter-godown transfer feature
- When enabled:
  - Stock can be transferred between godowns
  - Transfer records maintain **batch traceability** (if batching enabled)
  - Transfer history logged with date, quantity, source, destination

---

# Notification System

## Channels

| Channel    | Description                             |
| ---------- | --------------------------------------- |
| **In-App** | Notification bell in web and mobile app |
| **Push**   | Mobile push notifications via FCM       |

## Notification Events

| Event                              | Recipients                    | Priority |
| ---------------------------------- | ----------------------------- | -------- |
| Credit due approaching             | Owner, Staff (accountant)     | Medium   |
| Credit overdue                     | Owner, Staff (accountant)     | High     |
| Wage cycle ready for review        | Owner                         | Medium   |
| Wage approved / paid               | Wager                         | Medium   |
| Damage reported (pending approval) | Owner                         | High     |
| Fraud/anomaly alert                | Owner                         | High     |
| Production return recorded         | Owner, Staff                  | Low      |
| Advance balance low                | Wager                         | Low      |
| Loom downtime reported             | Owner                         | Medium   |
| Inventory mismatch detected        | Owner, Staff (godown manager) | High     |

---

# Multi-Language Architecture

## Launch Languages

- English
- Tamil

## Architecture

- Translation key-based system (e.g., `inventory.cone.stock` → "Cone Stock" / "கோன் இருப்பு")
- All UI strings stored as translation keys
- Language selection per user (not per tenant)
- Expandable to Hindi, Telugu, and others post-launch
- Numbers, dates, and currency formatted per locale

---

# Reports & Analytics Dashboard

## Production Reports

- Batch profitability (if batching enabled)
- Color profitability
- Product profitability
- Production summary (daily / weekly / monthly)

## Wager Reports

- Weekly wage sheet
- Damage % per wager
- Capacity utilization per wager
- Advance balance per wager
- Wager ranking (if visibility enabled)

## Inventory Reports

- Cone stock (by color, godown)
- Paavu stock
- Finished stock (by stage)
- Bundle stock
- Stock movement history

## Finance Reports

- GST summary (CGST/SGST/IGST breakup)
- Customer receivables (aging: 0-30, 30-60, 60-90, 90+)
- Supplier ledger
- Revenue summary

## Performance Reports

- Loom utilization per type
- Wager ranking
- Downtime report (by reason, by loom, by wager)
- Shift-wise production (if shifts enabled)

---

# UX Principles

The primary users (owners, wagers) are **40+ aged**, often not tech-savvy. The UI must be:

- **Large touch targets** — Minimum 48px tap areas, large buttons
- **Minimal form fields** — Auto-calculate wherever possible, hide optional fields behind expandable sections
- **One-tap actions** — Stage transitions, approvals, and common actions should be single-tap
- **Clear visual hierarchy** — Large fonts, high contrast, clear labels in local language
- **Confirmation dialogs** — For irreversible actions (damage approval, wage payment)
- **Offline-friendly** — Queue actions when offline, sync when connected (especially for mobile)
- **Dashboard-first** — Show key numbers (today's production, pending approvals, due payments) on login
- **Voice/regional number input** — Support Tamil numeral entry and regional phone formats

---

# System Completeness Status

| Feature                                                     | Status   |
| ----------------------------------------------------------- | -------- |
| Multi-tenant SaaS (shared DB, tenant isolation)             | Included |
| Web app (Next.js)                                           | Included |
| Native mobile app (React Native / Expo)                     | Included |
| Phone OTP + PIN authentication                              | Included |
| Role-based access (Owner, Staff, Wager, Tailor, Packager)   | Included |
| Optional batch-based manufacturing                          | Included |
| 4 wager types with weight/count return logic                | Included |
| Damage grading (Minor / Major / Reject) with owner approval | Included |
| Advance deduction + negative balance handling               | Included |
| Capacity-based performance tracking                         | Included |
| Downtime-adjusted expectations (wager + owner recorded)     | Included |
| Shift tracking with shift-wise wage rates (optional)        | Included |
| Wager performance ranking with visibility control           | Included |
| Retail + Wholesale support                                  | Included |
| Partial payment + Bill-to-bill settlement                   | Included |
| GST invoice (auto CGST/SGST vs IGST)                        | Included |
| Configurable credit period per customer                     | Included |
| Optional E-way bill JSON export                             | Included |
| Multi-godown with optional inter-godown transfers           | Included |
| All-stage inventory tracking                                | Included |
| In-app + Push notifications                                 | Included |
| English + Tamil (extensible i18n)                           | Included |
| Fraud detection engine                                      | Included |
| Comprehensive reporting & analytics                         | Included |
| 40+ age-friendly UX design                                  | Included |

---
