# Powerloom ERP — Claude Playbook

## Project Overview

Multi-tenant SaaS ERP for **powerloom textile manufacturing** (woven textile production). Targets powerloom owners, wholesalers, and textile micro-manufacturing clusters in Tamil Nadu, India.

**Specification:** `docs/powerloom-erp-v3.md` is the source of truth. `docs/questions.txt` has client Q&A clarifications.

**Status:** Planning/documentation phase — no code implementation yet.

## Tech Stack

| Layer       | Technology                         |
| ----------- | ---------------------------------- |
| Web         | Next.js (React), SSR               |
| Mobile      | React Native (Expo)                |
| Backend API | Node.js / TypeScript               |
| Database    | PostgreSQL (Supabase)              |
| Auth        | Phone OTP + optional 4-digit PIN   |
| Push        | Firebase Cloud Messaging (FCM)     |
| Storage     | S3-compatible (Cloudflare R2)      |
| Hosting     | Vercel (web), Railway/Render (API) |

- Shared TypeScript codebase between web, mobile, and API where feasible
- RESTful API (or tRPC) consumed by both web and mobile
- Free-tier friendly tooling preferred
- Translation key-based i18n from day one (English + Tamil)

## Domain Terminology

These are industry-specific terms — use them consistently:

- **Paavu** — Warp threads (length direction of the woven fabric). The longer dimension.
- **Oodai** — Weft/cross threads (width direction of the woven fabric). The shorter dimension.
- **Wager** — Powerloom operator who runs looms and produces woven fabrics. NOT a betting term.
- **Paavu Pattarai** — Warp preparation unit where cones are converted to Paavu threads.
- **Paavu Oati** — Worker who prepares Paavu in the Pattarai. Paid per Paavu count.
- **Cone** — Raw cotton thread spool purchased from suppliers (measured in kg, ~60kg/bale).
- **Godown** — Warehouse/storage facility.
- **Bale** — Unit of cone purchase (~60kg standard).

### Wager Types (critical business logic)

| Type | Loom Ownership | Work Scope    | Return Basis                     | Wage Basis |
| ---- | -------------- | ------------- | -------------------------------- | ---------- |
| 1    | Own loom       | Paavu + Oodai | Weight mandatory, count optional | Per kg     |
| 2    | Own loom       | Oodai only    | Count mandatory, weight optional | Per piece  |
| 3    | Owner's loom   | Paavu + Oodai | Weight mandatory, count optional | Per kg     |
| 4    | Owner's loom   | Oodai only    | Count mandatory, weight optional | Per piece  |

## Architecture Rules

### Multi-Tenancy

- Shared database with `tenant_id` column on **every table**
- Row-Level Security (RLS) policies at the database level
- API middleware must enforce tenant scoping on every request
- No tenant can ever access another tenant's data

### Inventory Stages (6-stage pipeline)

All stock is tracked by: **Godown + Product + Color + Stage + Batch (if enabled)**

```
Raw (Cone/kg) → Paavu (count) → Woven/Loose (pieces+kg) → Tailored (pieces) → Bundled (bundles) → Sold
```

Stage transitions should be **one-tap actions** in the UI.

### Batch System

- **Optional per tenant** (feature flag toggle)
- When ON: all operations link to a Batch ID for full traceability (cone → paavu → product → sale)
- When OFF: batch-related fields are hidden in UI, operations work independently
- Closed batches can be reopened; products from closed batches can still be sold

### Authentication

- Primary: Phone OTP via SMS
- Fallback: Phone + 4-digit PIN (for unreliable SMS areas)
- Tenants can enable one or both methods

## Business Logic Guardrails

### Wage Calculation

```
Gross Wage (production-based)
- Advance Deduction (configurable amount per week)
- Damage Deduction (approved damages for the week)
= Net Payable
```

- Wage cycle day is **configurable per tenant** (not hardcoded to Sunday)
- If net payable is zero/negative, owner CAN still pay a discretionary amount → added to advance balance → deducted gradually in upcoming weeks
- Paavu Oati wage = Paavu count x rate per Paavu
- Tailor wage = (stitch count x stitch rate) + (knot count x knot rate)
- Packager wage = bundle count x rate per bundle type

### Damage Management

- Grades: Minor / Major / Reject (configurable deduction rates per tenant)
- **Owner approval required** before any deduction is applied
- Damage traceable to original wager **indefinitely**
- Unidentifiable damage → "Miscellaneous" category (owner absorbs cost)
- Deduction = Damage Count x Production Cost per Piece x Grade Deduction Rate

### GST

- Auto-detect: intra-state (CGST + SGST) vs inter-state (IGST) based on customer location
- GST rate configurable per product
- Optional E-way bill JSON export

### Credit & Payments

- Credit period configurable per customer (default 30 days)
- Two customer types: Partial Payment (any amount against invoices) and Bill-to-Bill (full invoice settlement)
- Notifications: approaching due, on due, overdue reminders

## Roles & Access Control

| Role        | Scope                | Access                                                  |
| ----------- | -------------------- | ------------------------------------------------------- |
| Super Admin | Platform-wide        | Manages tenants, billing, platform settings             |
| Owner/Admin | Full tenant          | All modules, all data                                   |
| Staff       | Granular permissions | Configurable: godown, production, wages, sales, reports |
| Wager       | Own data only (read) | Own production, returns, wages, advances                |
| Tailor      | Own data only (read) | Own stitch/knot counts and wages                        |
| Packager    | Own data only (read) | Own bundling counts and wages                           |

## UX Constraints

Primary users are **40+ aged, not tech-savvy**. Every UI decision must respect:

- Minimum **48px touch targets**, large buttons
- **Minimal form fields** — auto-calculate wherever possible, hide optional fields behind expandable sections
- **One-tap actions** for stage transitions and approvals
- Large fonts, high contrast, clear labels in local language
- Confirmation dialogs for irreversible actions (damage approval, wage payment)
- **Offline-friendly** — queue actions when offline, sync when connected (especially mobile)
- **Dashboard-first** — show key numbers on login (today's production, pending approvals, due payments)

## Database Conventions

- Every table includes `tenant_id` (never optional)
- Use `snake_case` for all database columns and table names
- Use `camelCase` for TypeScript variables, functions, and API responses
- Timestamps: `created_at`, `updated_at` on every table
- Soft deletes where business logic requires audit trail
- Stock dimensions: `godown_id + product_id + color + stage + batch_id (nullable)`

## Code Conventions

- TypeScript strict mode everywhere
- Shared types between frontend/backend in a common package
- API validation at system boundaries (user input, external APIs)
- All user-facing strings must use i18n translation keys (e.g., `inventory.cone.stock`)
- Never hardcode tenant-specific values — always use tenant settings/config
- Feature flags for optional features: batching, shift tracking, inter-godown transfers

## Key Reports (for reference)

Production: batch/color/product profitability, daily/weekly/monthly summaries
Wager: wage sheet, damage %, capacity utilization, advance balance, ranking
Inventory: cone stock, paavu stock, finished stock by stage, stock movement
Finance: GST summary, customer receivables aging (0-30/30-60/60-90/90+), supplier ledger
Performance: loom utilization, wager ranking, downtime by reason/loom/wager, shift-wise production
