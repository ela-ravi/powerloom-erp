# Powerloom ERP — UI Functionality Specification

> Derived from the backend API (`src/modules/`), V3 spec (`docs/powerloom-erp-v3.md`), and client Q&A (`docs/questions.txt`).
> This document is the source of truth for building the Web (React) and Mobile (React Native) clients.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [User Roles & Access Matrix](#2-user-roles--access-matrix)
3. [UX Design Constraints](#3-ux-design-constraints)
4. [Authentication Screens](#4-authentication-screens)
5. [Navigation Structure](#5-navigation-structure)
6. [Dashboards (Role-Based)](#6-dashboards-role-based)
7. [Master Data Management](#7-master-data-management)
8. [Inventory & Godown](#8-inventory--godown)
9. [Production Pipeline](#9-production-pipeline)
10. [Damage Management](#10-damage-management)
11. [Post-Production](#11-post-production)
12. [Wages & Advances](#12-wages--advances)
13. [Sales & Finance](#13-sales--finance)
14. [Notifications & Fraud Alerts](#14-notifications--fraud-alerts)
15. [Reports & Analytics](#15-reports--analytics)
16. [Tenant & Platform Administration](#16-tenant--platform-administration)
17. [Settings & Preferences](#17-settings--preferences)
18. [Feature Flag Gating](#18-feature-flag-gating)
19. [Offline & Sync Strategy](#19-offline--sync-strategy)
20. [i18n & Localization](#20-i18n--localization)
21. [Cross-Cutting UI Patterns](#21-cross-cutting-ui-patterns)

---

## 1. Platform Overview

### Target Clients

| Client | Tech | Primary Users |
|--------|------|---------------|
| **Web** | React (Next.js SSR) | Owner, Staff, Super Admin |
| **Mobile** | React Native (Expo) | Owner, Staff, Wager, Tailor, Packager |

### Backend API

- Base URL: `/api/`
- Auth: Bearer JWT (access token 15min, refresh token 7d)
- Response shape: `{ data }` or `{ data, pagination: { total, limit, offset, hasMore } }`
- Error shape: `{ error: { code, message, details? } }`

### API Endpoint Summary

The backend exposes **~80 endpoints** across 30 modules. Every data endpoint is tenant-scoped via JWT + RLS.

---

## 2. User Roles & Access Matrix

### Roles

| Role | Platform | Description |
|------|----------|-------------|
| **Super Admin** | Web only | Platform operator — manages tenants, billing |
| **Owner** | Web + Mobile | Full tenant access — all modules, all data |
| **Staff** | Web + Mobile | Granular permissions (7 permission types) |
| **Wager** | Mobile only | Self-service read-only: own production, wages, advances, damages |
| **Tailor** | Mobile only | Self-service read-only: own stitch/knot records, wages |
| **Packager** | Mobile only | Self-service read-only: own bundling records, wages |

### Staff Permission Types

| Permission | Modules Unlocked |
|------------|-----------------|
| `MASTER_DATA` | Loom types, looms, products, suppliers, customers, godowns, wagers, users |
| `PRODUCTION_ENTRY` | Cone issuances, paavu production, production returns, downtimes, shifts, batches, tailoring, packaging |
| `GODOWN_MANAGEMENT` | Cone purchases, inventory view, inter-godown transfers |
| `DAMAGE_APPROVAL` | Approve/reject damage records |
| `WAGE_PROCESSING` | Advances, wage cycle generation/transitions, wage records |
| `SALES_INVOICING` | Invoices, payments, customer statements |
| `REPORTS` | All report screens |

### Visibility Matrix (screen → roles)

| Screen | Super Admin | Owner | Staff (with permission) | Wager | Tailor | Packager |
|--------|:-----------:|:-----:|:-----------------------:|:-----:|:------:|:--------:|
| **Login** | x | x | x | x | x | x |
| **Owner Dashboard** | | x | | | | |
| **Staff Dashboard** | | | x | | | |
| **Worker Dashboard** | | | | x | x | x |
| **Loom Types** | | x | MASTER_DATA | | | |
| **Looms** | | x | MASTER_DATA | | | |
| **Products** | | x | MASTER_DATA | | | |
| **Suppliers** | | x | MASTER_DATA | | | |
| **Customers** | | x | MASTER_DATA | | | |
| **Godowns** | | x | MASTER_DATA | | | |
| **Wagers** | | x | MASTER_DATA | | | |
| **Users** | | x | MASTER_DATA | | | |
| **Batches** | | x | PRODUCTION_ENTRY | | | |
| **Cone Purchases** | | x | GODOWN_MANAGEMENT | | | |
| **Inventory** | | x | GODOWN_MANAGEMENT | | | |
| **Transfers** | | x | GODOWN_MANAGEMENT | | | |
| **Cone Issuances** | | x | PRODUCTION_ENTRY | | | |
| **Paavu Production** | | x | PRODUCTION_ENTRY | | | |
| **Production Returns** | | x | PRODUCTION_ENTRY | | | |
| **Loom Downtimes** | | x | PRODUCTION_ENTRY | | | |
| **Shifts** | | x | PRODUCTION_ENTRY | | | |
| **Damage Records** | | x | DAMAGE_APPROVAL | r/o own | | |
| **Tailoring Records** | | x | PRODUCTION_ENTRY | | r/o own | |
| **Packaging Records** | | x | PRODUCTION_ENTRY | | | r/o own |
| **Advances** | | x | WAGE_PROCESSING | r/o own | | |
| **Wage Cycles** | | x | WAGE_PROCESSING | r/o own | r/o own | r/o own |
| **Invoices** | | x | SALES_INVOICING | | | |
| **Payments** | | x | SALES_INVOICING | | | |
| **Notifications** | | x | x | x | x | x |
| **Fraud Alerts** | | x | x (view) | | | |
| **Reports** | | x | REPORTS | | | |
| **Tenant Settings** | | x | | | | |
| **Platform Admin** | x | | | | | |

---

## 3. UX Design Constraints

Primary users are **40+ years old, not tech-savvy**, working in Tamil Nadu textile manufacturing clusters.

### Mandatory Design Rules

1. **Touch Targets**: Minimum **48px** on mobile, equivalent on web
2. **Large Fonts**: Body text min 16px, headers min 20px, numbers in data-heavy screens min 18px
3. **High Contrast**: WCAG AA compliant, strong foreground/background contrast
4. **Minimal Forms**: Auto-calculate wherever possible; hide optional fields behind expandable "More Options" sections
5. **One-Tap Actions**: Stage transitions, approvals, status changes must be single-tap with confirmation
6. **Confirmation Dialogs**: Required for all irreversible actions (damage approval, wage payment, invoice cancellation, user deactivation)
7. **Dashboard-First**: Login lands on role-appropriate dashboard with key numbers
8. **Bilingual Labels**: Every UI string via i18n keys (English + Tamil)
9. **Offline Queue** (mobile): Queue write operations when offline, sync when connected, show pending indicator
10. **Number-Heavy UI**: Use tabular layouts, large monospace numbers, currency formatting (INR ₹), weight formatting (kg/g)
11. **Color Coding**: Use consistent colors for inventory stages, damage grades, invoice statuses, alert severities

### Suggested Color Palette for Statuses

| Status | Color |
|--------|-------|
| Active / Operational / Open | Green |
| Pending / Draft / Review | Amber/Yellow |
| Approved / Paid / Completed | Blue |
| Rejected / Cancelled / Suspended | Red |
| Overdue / Critical | Deep Red |
| Idle / Inactive | Gray |

---

## 4. Authentication Screens

### 4.1 Login Screen

**API**: `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`, `POST /api/auth/pin/verify`

**Flow**:
```
Phone Entry → [OTP or PIN based on tenant settings]
  ├─ OTP Path: Enter phone → Receive OTP → Enter 6-digit code → Dashboard
  └─ PIN Path: Enter phone → Enter 4-digit PIN → Dashboard
```

**UI Elements**:
- Phone number input with country code prefix (+91 default)
- Large numeric keypad (for 40+ users)
- "Send OTP" button (48px+ height)
- OTP input: 6 individual digit boxes, auto-advance on entry
- PIN input: 4 individual digit boxes, masked
- Timer showing OTP expiry (5 minutes countdown)
- "Resend OTP" button (appears after 30s cooldown)
- Error states: invalid OTP, expired OTP, rate limited (max 5/hour), phone not found
- Language toggle (EN/TA) on login screen itself

**Behavior**:
- If tenant has both OTP and PIN enabled: show toggle "Login with OTP" / "Login with PIN"
- If only OTP enabled: show OTP flow
- If only PIN enabled: show PIN flow
- On success: store access + refresh tokens securely, navigate to dashboard
- Login response includes `featureFlags` — store in app state to control UI visibility

### 4.2 PIN Setup Screen

**API**: `PUT /api/auth/pin`

**Shown to**: Users who haven't set a PIN yet (and tenant has PIN auth enabled)

**UI Elements**:
- "Set your 4-digit PIN" header
- PIN input (4 digits) + confirm PIN input
- "Set PIN" button
- Validation: PINs must match, exactly 4 digits

### 4.3 Token Refresh (Background)

**API**: `POST /api/auth/refresh`

- Handled automatically by API client interceptor
- On 401 response: attempt refresh with stored refresh token
- If refresh fails: redirect to login screen
- Show "Session expired, please login again" message

---

## 5. Navigation Structure

### 5.1 Web Navigation (Owner/Staff/Super Admin)

```
Sidebar Navigation:
├── Dashboard
├── Master Data (expandable)
│   ├── Loom Types
│   ├── Looms
│   ├── Products
│   ├── Suppliers
│   ├── Customers
│   ├── Godowns
│   └── Wagers
├── Users & Permissions
├── Inventory (expandable)
│   ├── Stock Overview
│   ├── Cone Purchases
│   ├── Transfers [if interGodownTransferEnabled]
│   └── Stock Movements
├── Production (expandable)
│   ├── Batches [if batchEnabled]
│   ├── Cone Issuances
│   ├── Paavu Production
│   ├── Production Returns
│   ├── Loom Downtimes
│   └── Shifts [if shiftEnabled]
├── Quality (expandable)
│   └── Damage Records
├── Post-Production (expandable)
│   ├── Tailoring Records
│   └── Packaging Records
├── Wages (expandable)
│   ├── Advances
│   └── Wage Cycles
├── Sales (expandable)
│   ├── Invoices
│   └── Payments
├── Reports (expandable)
│   ├── Production Reports
│   ├── Wager Reports
│   ├── Inventory Reports
│   ├── Finance Reports
│   └── Performance Reports
├── Fraud Alerts
├── Notifications (bell icon in header)
└── Settings
    ├── Tenant Settings
    └── My Profile
```

Header bar:
- Tenant name / logo
- Notification bell with unread count badge
- Language toggle (EN/TA)
- User avatar + name dropdown (Profile, Logout)

### 5.2 Mobile Navigation (All Roles)

**Bottom Tab Bar** (max 5 tabs, role-dependent):

**Owner/Staff**:
```
Tabs: Dashboard | Production | Inventory | Sales | More
"More" → Wages, Reports, Master Data, Settings, Fraud Alerts
```

**Wager**:
```
Tabs: Home | My Production | My Wages | My Advances | Notifications
```

**Tailor**:
```
Tabs: Home | My Work | My Wages | Notifications
```

**Packager**:
```
Tabs: Home | My Work | My Wages | Notifications
```

---

## 6. Dashboards (Role-Based)

### 6.1 Owner Dashboard

**API calls on load**:
- `GET /api/reports/production-summary` (today)
- `GET /api/inventory/summary`
- `GET /api/damage-records?approvalStatus=pending`
- `GET /api/wage-cycles?status=draft`
- `GET /api/invoices?status=overdue`
- `GET /api/fraud-alerts?isResolved=false`
- `GET /api/notifications/unread-count`

**Layout** (card-based grid):

| Card | Content |
|------|---------|
| **Today's Production** | Total pieces returned, total weight (kg), wager count active today |
| **Pending Approvals** | Count of pending damage records + count of draft wage cycles. Tap → navigates to respective list |
| **Inventory Snapshot** | Mini bar/pie chart by stage (Raw cone kg, Paavu count, Woven pcs, Tailored pcs, Bundled count) |
| **Payment Due** | Count + total value of overdue invoices. Tap → overdue invoices list |
| **Fraud Alerts** | Count of unresolved alerts by severity. Tap → fraud alerts list |
| **Quick Actions** | Large buttons: "Record Production Return", "Issue Cones", "Create Invoice", "Manage Wages" |

### 6.2 Staff Dashboard

Same as Owner but **filtered by assigned permissions**. Cards only shown for permitted modules:
- PRODUCTION_ENTRY → Today's Production, Quick Actions (production-related)
- GODOWN_MANAGEMENT → Inventory Snapshot
- DAMAGE_APPROVAL → Pending Approvals (damage only)
- WAGE_PROCESSING → Wage Cycles
- SALES_INVOICING → Payment Due
- REPORTS → Show "View Reports" card

### 6.3 Wager Self-Service Dashboard

**API calls on load**:
- `GET /api/auth/me` (profile, current wage info)
- `GET /api/production-returns?wagerId={self}` (recent)
- `GET /api/wage-cycles/worker/me` (latest paid cycle)
- `GET /api/advances?wagerId={self}` (recent transactions)
- `GET /api/damage-records?wagerId={self}` (own damages)
- `GET /api/notifications/unread-count`

**Layout**:

| Card | Content |
|------|---------|
| **My Profile** | Name, phone, wager type (1-4), assigned looms |
| **This Week's Production** | Total pieces/weight returned this cycle period |
| **Last Wage** | Net payable from most recent paid wage cycle, breakdown link |
| **Advance Balance** | Current outstanding advance amount |
| **Recent Damages** | Count of pending/approved damage records this month |
| **Performance** | Utilization % (if `showWagerRanking` enabled), rank among peers |

### 6.4 Tailor Self-Service Dashboard

**API calls on load**:
- `GET /api/auth/me`
- `GET /api/tailoring-records?tailorId={self}` (recent)
- `GET /api/wage-cycles/worker/me`
- `GET /api/notifications/unread-count`

**Layout**:

| Card | Content |
|------|---------|
| **My Profile** | Name, phone |
| **This Week's Work** | Total stitch count, knot count, estimated wage |
| **Last Wage** | Net payable from most recent paid cycle |
| **Recent Records** | List of recent tailoring entries |

### 6.5 Packager Self-Service Dashboard

Same pattern as Tailor but with:
- Bundle count (small/large)
- Total pieces packed
- Estimated wage from bundle rates

---

## 7. Master Data Management

All master data screens follow a consistent **list → detail/edit** pattern.

### Common List Screen Pattern

- Search bar at top (searches by name)
- Filter chips/dropdown (e.g., status, type)
- Paginated list (20 items default, infinite scroll on mobile)
- Each row shows key info + status badge
- FAB (floating action button) or top-right "+" button to create
- Pull-to-refresh on mobile

### Common Create/Edit Form Pattern

- Full-screen form (mobile) or modal/side panel (web)
- Required fields marked with asterisk
- Optional fields behind "More Options" expandable section
- Save button at bottom (sticky on mobile)
- Validation errors shown inline under each field
- Cancel/back to discard

---

### 7.1 Loom Types

**API**: `GET/POST /api/loom-types`, `PUT /api/loom-types/:id`

**List Screen**:
- Columns: Name, Nickname, Capacity (pcs/day), Status
- Filter: Active/Inactive

**Create/Edit Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | Yes | Max 100 chars |
| Nickname | Text | No | e.g., "Single", "Box", "Air" |
| Capacity (pieces/day) | Number | Yes | Positive integer |
| Active | Toggle | No | Edit only |

---

### 7.2 Looms

**API**: `GET/POST /api/looms`, `PUT /api/looms/:id`, `PUT /api/looms/:id/assign`

**List Screen**:
- Columns: Loom Number, Type, Ownership, Status, Assigned Wager
- Filters: Loom Type, Maintenance Status, Assigned Wager
- Status badge color-coded (Operational=green, Maintenance=amber, Idle=gray)

**Create/Edit Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Loom Number | Text | Yes | Unique per tenant (e.g., "L-001") |
| Loom Type | Dropdown | Yes | Populated from loom types list |
| Ownership | Radio | Yes | "Owner's Loom" / "Wager's Own Loom" |
| Maintenance Status | Dropdown | No | Operational (default) / Under Maintenance / Idle |
| Assigned Wager | Searchable dropdown | No | List of active wagers. Nullable (unassign) |

**Quick Action**: "Assign Wager" — one-tap from list row, shows wager picker.

---

### 7.3 Products

**API**: `GET/POST /api/products`, `PUT /api/products/:id`, plus color-prices and shift-rates sub-endpoints

**List Screen**:
- Columns: Name, Size, Category, Wage Rate (per kg / per piece), GST %, Status
- Filter: Category, Active/Inactive

**Create/Edit Form** (most complex master data form):

| Section | Field | Type | Required | Notes |
|---------|-------|------|----------|-------|
| **Basic** | Name | Text | Yes | e.g., "Khadi", "Jakkadu" |
| | Size | Text | Yes | e.g., "30x60", "27x54" |
| | Category | Dropdown | Yes | Single / Double / Triple / Quad |
| | HSN Code | Text | No | For e-way bill |
| **Paavu (Warp)** | Paavu-to-Piece Ratio | Number | Yes | How many pieces per paavu |
| | Paavu Consumption (g) | Number | Yes | Grams per piece |
| | Paavu Wastage (g) | Number | No | Default 0 |
| | Paavu Wastage (%) | Number | No | Auto-calc or manual |
| **Oodai (Weft)** | Oodai Consumption (g) | Number | Yes | Grams per piece |
| | Oodai Wastage (g) | Number | No | Default 0 |
| | Oodai Wastage (%) | Number | No | Auto-calc or manual |
| **Wage Rates** | Rate per Kg | Currency | No | For Type 1&3 wagers |
| | Rate per Piece | Currency | No | For Type 2&4 wagers |
| | Stitch Rate per Piece | Currency | No | For tailors |
| | Knot Rate per Piece | Currency | No | For tailors |
| **Bundle Config** | Small Bundle Count | Number | No | Pieces per small bundle (default 10) |
| | Large Bundle Count | Number | No | Pieces per large bundle (default 50) |
| | Small Bundle Rate | Currency | No | Packager wage per small bundle |
| | Large Bundle Rate | Currency | No | Packager wage per large bundle |
| **Pricing & Tax** | GST Rate (%) | Number | No | Default 5% |
| | Color Pricing Mode | Radio | No | Average (default) / Per-Color |

**UX**: Group into collapsible sections. Show "Basic" and "Wage Rates" expanded by default. Hide Paavu/Oodai details, Bundle Config, and Pricing behind expandable sections.

**Sub-Screens (within Product detail)**:

**Color Prices Tab** (only shown when `colorPricingMode = per_color`):
- List: Color name, Selling Price per Piece
- Add/Edit/Delete color price entries
- Form: Color (text), Selling Price (currency)

**Shift Wage Rates Tab** (only shown when `shiftEnabled = true`):
- List: Shift name, Rate per Kg, Rate per Piece
- Add/Edit shift rate overrides
- Form: Shift (dropdown), Rate per Kg (currency), Rate per Piece (currency)

---

### 7.4 Suppliers

**API**: `GET/POST /api/suppliers`, `PUT /api/suppliers/:id`

**List Screen**:
- Columns: Name, Phone, GSTIN, Status
- Filter: Active/Inactive

**Create/Edit Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | Yes | |
| Phone | Phone | No | +91 prefix |
| Address | Textarea | No | |
| GSTIN | Text | No | 15-char GST number |

---

### 7.5 Customers

**API**: `GET/POST /api/customers`, `PUT /api/customers/:id`

**List Screen**:
- Columns: Name, Phone, Customer Type, State, Credit Period, Outstanding Balance, Status
- Filter: Customer Type, Active/Inactive
- Outstanding balance highlighted in red if > 0

**Create/Edit Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | Yes | |
| Phone | Phone | No | |
| Address | Textarea | No | |
| State Code | Dropdown | Yes | Indian states (2-char code). **Critical for GST auto-detection** |
| GSTIN | Text | No | |
| Customer Type | Radio | Yes | Wholesale (Partial Payment) / Wholesale (Bill-to-Bill) / Retail |
| Credit Period (days) | Number | Yes | Default from tenant settings (30). Retail = 0 |

**UX**: Explain customer types with help tooltips:
- Partial Payment: "Customer can pay any amount against invoices"
- Bill-to-Bill: "Customer must pay full invoice amount"
- Retail: "Immediate/cash payment expected"

---

### 7.6 Godowns (Warehouses)

**API**: `GET/POST /api/godowns`, `PUT /api/godowns/:id`

**List Screen**:
- Columns: Name, Type, Is Main, Address, Status
- Filter: Type (Godown / Paavu Pattarai), Active/Inactive

**Create/Edit Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | Yes | e.g., "Main Godown", "Paavu Pattarai" |
| Godown Type | Radio | Yes | Godown (default) / Paavu Pattarai |
| Address | Textarea | No | |
| Is Main | Toggle | No | Only one main godown allowed per tenant |

---

### 7.7 Wager Profiles

**API**: `GET/POST /api/wagers`, `PUT /api/wagers/:id`, `GET /api/wagers/:id/performance`, `GET /api/wagers/ranking`

**List Screen**:
- Columns: Name (from user), Phone, Wager Type, Assigned Looms, Advance Balance, Status
- Filter: Wager Type (1-4), Active/Inactive
- Advance balance shown with ₹ formatting

**Create Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| User | Searchable dropdown | Yes | List of users with role "wager" |
| Wager Type | Radio with descriptions | Yes | See type descriptions below |
| Initial Advance | Currency | No | Default 0 |

**Wager Type Selection UI** (must be very clear for owners):
- **Type 1**: "Own Loom — Does Paavu + Oodai — Returns by Weight — Paid per kg"
- **Type 2**: "Own Loom — Does Oodai Only — Returns by Count — Paid per piece"
- **Type 3**: "Owner's Loom — Does Paavu + Oodai — Returns by Weight — Paid per kg"
- **Type 4**: "Owner's Loom — Does Oodai Only — Returns by Count — Paid per piece"

**Wager Detail Screen** (tabs):
- **Overview Tab**: Profile info, type, assigned looms, advance balance
- **Performance Tab**: Utilization %, production chart, downtime summary (date range picker)
- **Production Tab**: List of production returns
- **Damages Tab**: List of damage records
- **Wages Tab**: List of wage records
- **Advances Tab**: Transaction history

**Wager Ranking Screen** (if `showWagerRanking` enabled):
- Ranked list of wagers by utilization %
- Date range filter
- Bar chart visualization
- Columns: Rank, Name, Type, Utilization %, Pieces Produced, Downtime Hours

---

### 7.8 Users & Permissions

**API**: `GET/POST /api/users`, `PUT /api/users/:id`, `PUT /api/users/:id/deactivate`, `GET/PUT /api/users/:id/permissions`

**List Screen**:
- Columns: Name, Phone, Role, Language, Active Status
- Filter: Role, Active/Inactive
- Role shown as colored badge

**Create Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | Yes | |
| Phone | Phone | Yes | +91 prefix, unique per tenant |
| Role | Dropdown | Yes | Owner / Staff / Wager / Tailor / Packager |
| Language | Dropdown | No | English (default) / Tamil |

**User Detail Screen**:
- Profile info
- Deactivate button (with confirmation dialog)
- **Permissions Section** (only for Staff role):
  - Checklist of 7 permissions with toggles
  - Each permission has a description tooltip
  - Save button

---

## 8. Inventory & Godown

### 8.1 Stock Overview

**API**: `GET /api/inventory`, `GET /api/inventory/summary`

**Main View**: Dashboard-style inventory overview

**Summary Cards** (top section):
| Stage | Unit | Display |
|-------|------|---------|
| Raw Cone | kg | Total kg across all godowns |
| Paavu | count | Total paavu count |
| Woven | pieces | Total woven pieces |
| Tailored | pieces | Total tailored pieces |
| Bundled | bundles | Total bundles |

**Detailed Table** (below summary):
- Columns: Godown, Product, Color, Stage, Quantity, Weight (kg), Batch (if enabled)
- Filters: Godown dropdown, Product dropdown, Color text, Stage dropdown, Batch dropdown (if enabled)
- Color-coded stage badges (each stage a different color)
- Sortable columns

**Drill-Down**: Tap any inventory row → Movement History screen

### 8.2 Stock Movement History

**API**: `GET /api/inventory/:id/movements`

- Chronological list of movements for a specific inventory record
- Columns: Date, Movement Type (Increase/Decrease/Transfer In/Transfer Out), Quantity, Reference
- Movement type icons/badges
- Reference links to source operation (cone purchase, production return, etc.)

### 8.3 Cone Purchases

**API**: `GET/POST /api/cone-purchases`

**List Screen**:
- Columns: Date, Supplier, Product, Color, Quantity (kg), Rate (₹/kg), Total Cost (₹), GST, Invoice #
- Filters: Supplier, Product, Date range
- Sort: Date descending (default)

**Create Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Supplier | Searchable dropdown | Yes | Active suppliers list |
| Godown | Dropdown | Yes | Where cones will be stored |
| Product | Dropdown | Yes | Active products list |
| Color | Text / Dropdown | Yes | Free text or preset colors |
| Batch | Dropdown | No | Only shown if `batchEnabled`. Open/In-Progress batches |
| Quantity (kg) | Number | Yes | Positive decimal |
| Rate per Kg (₹) | Currency | Yes | |
| GST Rate (%) | Number | No | Default from product config |
| Invoice Number | Text | No | Supplier invoice reference |
| Purchase Date | Date picker | No | Defaults to today |
| Notes | Textarea | No | |

**Auto-Calculated** (shown live as user types):
- Total Cost = Quantity × Rate
- GST Amount = Total Cost × (GST Rate / 100)
- Grand Total = Total Cost + GST Amount

### 8.4 Inter-Godown Transfers

**Feature flag**: Only shown if `interGodownTransferEnabled = true`

**API**: `GET/POST /api/transfers`

**List Screen**:
- Columns: Date, From Godown, To Godown, Product, Color, Stage, Quantity, Notes
- Filters: Source Godown, Destination Godown

**Create Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Source Godown | Dropdown | Yes | |
| Destination Godown | Dropdown | Yes | Must differ from source |
| Product | Dropdown | Yes | |
| Color | Text | Yes | |
| Stage | Dropdown | Yes | Raw Cone / Paavu / Woven / Tailored / Bundled |
| Batch | Dropdown | No | Only if `batchEnabled` |
| Quantity | Number | Yes | Must not exceed available stock (show available) |
| Weight (kg) | Number | No | Required for cone/paavu stages |
| Notes | Textarea | No | |

**UX**: Show available stock for selected combination (godown + product + color + stage + batch) inline, so user knows max transferable quantity.

---

## 9. Production Pipeline

### 9.1 Batches

**Feature flag**: Only shown if `batchEnabled = true`

**API**: `GET/POST /api/batches`, `PUT /api/batches/:id`, `PUT /api/batches/:id/status`

**List Screen**:
- Columns: Batch Number, Product, Status, Created Date, Notes
- Status badges: Open (green), In Progress (amber), Closed (gray)
- Filter: Status, Product

**Create Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Product | Dropdown | Yes | Active products |
| Notes | Textarea | No | |

Batch number auto-generated: `B-YYYYMMDD-###`

**Detail Screen**:
- Batch info header (number, product, status, dates)
- Status transition buttons:
  - Open → "Start Production" → In Progress
  - In Progress → "Close Batch" → Closed
  - Closed → "Reopen Batch" → Open (with confirmation)
- **Linked Operations** (tabs/sections):
  - Cone Issuances linked to this batch
  - Paavu Productions linked to this batch
  - Production Returns linked to this batch
  - Damage Records linked to this batch
  - Tailoring/Packaging Records linked to this batch
- **Batch Profitability Summary** (if data available):
  - Total cone cost
  - Total wage cost
  - Total revenue (from invoices)
  - Profit/Loss

### 9.2 Cone Issuances

**API**: `GET/POST /api/cone-issuances`

**List Screen**:
- Columns: Date, Wager, Godown, Product, Color, Quantity (kg), Batch (if enabled)
- Filters: Wager, Godown, Product

**Create Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Wager | Searchable dropdown | Yes | Active wagers |
| Godown | Dropdown | Yes | Godowns with raw cone stock |
| Product | Dropdown | Yes | |
| Color | Text / Dropdown | Yes | Colors available in selected godown for product |
| Batch | Dropdown | No | Only if `batchEnabled` |
| Quantity (kg) | Number | Yes | Show available stock inline |
| Notes | Textarea | No | |

**UX**: After selecting Godown + Product + Color, show available raw cone stock. Prevent issuing more than available.

### 9.3 Paavu Production

**API**: `GET/POST /api/paavu-productions`

**List Screen**:
- Columns: Date, Paavu Oati (worker), Product, Color, Cone Used (kg), Paavu Count, Wastage (g), Flagged
- Filters: Worker, Product, Date range
- Wastage flagged rows highlighted in amber/red

**Create Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Paavu Oati | Searchable dropdown | Yes | Users with Paavu Oati role |
| Godown | Dropdown | Yes | Paavu Pattarai type godowns |
| Product | Dropdown | Yes | |
| Color | Text | Yes | |
| Batch | Dropdown | No | Only if `batchEnabled` |
| Cone Weight Used (kg) | Number | Yes | |
| Paavu Count Produced | Number (integer) | Yes | |
| Wastage (g) | Number | No | Default 0. Auto-flag if > tenant limit |
| Production Date | Date picker | No | Defaults to today |
| Notes | Textarea | No | |

**Auto-Calculated Display**:
- Expected paavu count (based on cone weight and product's paavu consumption)
- Wastage % = wastage / (cone weight × 1000) × 100
- Warning badge if wastage exceeds `paavuWastageLimitGrams` from tenant settings

### 9.4 Production Returns

**API**: `GET/POST /api/production-returns`

**List Screen**:
- Columns: Date, Wager, Loom, Product, Color, Pieces, Weight (kg), Wastage, Shift (if enabled), Batch (if enabled)
- Filters: Wager, Loom, Product, Date range

**Create Form** (dynamic based on wager type):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Wager | Searchable dropdown | Yes | Active wagers. On select, show wager type |
| Loom | Dropdown | Yes | Looms assigned to selected wager |
| Godown | Dropdown | Yes | Destination godown |
| Product | Dropdown | Yes | |
| Color | Text | Yes | |
| Batch | Dropdown | No | Only if `batchEnabled` |
| Shift | Dropdown | No | Only if `shiftEnabled`. Active shifts |
| **Piece Count** | Number (integer) | **Yes if Type 2/4**, optional if Type 1/3 | |
| **Weight (kg)** | Number | **Yes if Type 1/3**, optional if Type 2/4 | |
| Wastage (kg) | Number | No | Default 0 |
| Return Date | Date picker | No | Defaults to today |
| Notes | Textarea | No | |

**Dynamic Form Behavior** (critical UX):
- When wager is selected, the form adapts:
  - **Type 1 or 3** (Paavu + Oodai): Weight field is **mandatory**, Piece Count is optional helper
  - **Type 2 or 4** (Oodai only): Piece Count is **mandatory**, Weight is optional helper
- Show label explaining the wager type: "This wager returns by weight (per kg)" or "This wager returns by count (per piece)"
- Show the applicable wage rate inline: "Rate: ₹X per kg" or "Rate: ₹X per piece"

**Auto-Calculated Display**:
- Estimated wage = weight × rate (Type 1/3) or count × rate (Type 2/4)
- If shift selected and shift rate exists, use shift rate instead

### 9.5 Loom Downtimes

**API**: `GET/POST /api/loom-downtimes`, `PUT /api/loom-downtimes/:id`

**List Screen**:
- Columns: Date, Loom, Wager, Reason, Start Time, End Time, Duration (min), Status (Active/Resolved)
- Active downtimes (no end time) shown at top with pulsing indicator
- Filters: Loom, Wager, Reason

**Create Form** (Start Downtime):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Loom | Dropdown | Yes | |
| Wager | Searchable dropdown | No | Who reported |
| Reason | Dropdown | Yes | Mechanical / Electrical / Material Shortage / Other |
| Custom Reason | Text | Conditional | Required when Reason = "Other" |
| Start Time | DateTime picker | Yes | Defaults to now |
| Notes | Textarea | No | |

**End Downtime** (from list row action):
- Shows start time
- End Time picker (defaults to now)
- Auto-calculates duration
- One-tap "End Downtime" button

### 9.6 Shifts

**Feature flag**: Only shown if `shiftEnabled = true`

**API**: `GET/POST /api/shifts`, `PUT /api/shifts/:id`

**List Screen**:
- Columns: Name, Start Time, End Time, Status
- Simple CRUD

**Create/Edit Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | Yes | e.g., "Morning", "Evening", "Night" |
| Start Time | Time picker | Yes | HH:MM format |
| End Time | Time picker | Yes | HH:MM format |

---

## 10. Damage Management

### 10.1 Damage Records

**API**: `GET/POST /api/damage-records`, `GET /api/damage-records/:id`, `PUT /api/damage-records/:id/approve`, `PUT /api/damage-records/:id/reject`

**List Screen**:
- Columns: Date, Wager, Product, Detection Point, Grade, Count, Deduction (₹), Approval Status
- Grade badges: Minor (amber), Major (orange), Reject (red)
- Approval badges: Pending (amber), Approved (green), Rejected (gray)
- Filters: Wager, Detection Point, Grade, Approval Status
- **Pending tab** prominently shown for Owner (approval queue)

**Create Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Production Return | Searchable dropdown | No | Link to specific return record |
| Wager | Searchable dropdown | Conditional | Required unless `isMiscellaneous` |
| Product | Dropdown | Yes | |
| Detection Point | Radio/Chips | Yes | Loom / Tailoring / Packaging / Godown |
| Grade | Radio/Chips | Yes | Minor / Major / Reject. Show deduction % for each |
| Damage Count | Number (integer) | Yes | Min 1 |
| Production Cost per Piece (₹) | Currency | Yes | Material + wage cost |
| Is Miscellaneous | Toggle | No | "Cannot identify wager" — owner absorbs cost |
| Notes | Textarea | No | |

**Auto-Calculated** (shown live):
- Deduction Rate: fetched from tenant settings per grade
- Total Deduction = Damage Count × Production Cost × (Deduction Rate / 100)
- Display: "This damage will deduct ₹X from the wager's next wage"

**Approval Screen** (Owner view):
- List of pending damage records
- Each record shows: wager name, product, grade, count, deduction amount
- Two large buttons per record: **Approve** (green) / **Reject** (red)
- Confirmation dialog: "Approve deduction of ₹X from {wager name}?"
- Batch approve option: select multiple → "Approve All Selected"

**Worker View** (Wager self-service):
- Read-only list of own damage records
- Shows: date, product, grade, count, deduction, status
- No action buttons (view only)

---

## 11. Post-Production

### 11.1 Tailoring Records

**API**: `GET/POST /api/tailoring-records`, `GET /api/tailoring-records/:id`

**List Screen** (Owner/Staff):
- Columns: Date, Tailor, Product, Color, Stitch Count, Knot Count, Wage (₹), Mismatch Flag
- Filters: Tailor, Product, Date range
- Mismatch flagged rows highlighted

**List Screen** (Tailor self-service):
- Same columns, filtered to own records only
- Read-only

**Create Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Tailor | Searchable dropdown | Yes | Users with role "tailor" |
| Godown | Dropdown | Yes | |
| Product | Dropdown | Yes | |
| Color | Text | Yes | |
| Batch | Dropdown | No | Only if `batchEnabled` |
| Stitch Count | Number (integer) | Yes | Min 1 |
| Knot Count | Number (integer) | No | Default 0 |
| Work Date | Date picker | No | Defaults to today |
| Notes | Textarea | No | |

**Auto-Calculated** (shown live):
- Stitch Wage = Stitch Count × Product's stitch rate
- Knot Wage = Knot Count × Product's knot rate
- Total Wage = Stitch Wage + Knot Wage
- Display: "Estimated wage: ₹X"

### 11.2 Packaging Records

**API**: `GET/POST /api/packaging-records`, `GET /api/packaging-records/:id`

**List Screen** (Owner/Staff):
- Columns: Date, Packager, Product, Color, Bundle Type, Bundle Count, Total Pieces, Wage (₹)
- Filters: Packager, Product, Bundle Type, Date range

**List Screen** (Packager self-service):
- Same, filtered to own records, read-only

**Create Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Packager | Searchable dropdown | Yes | Users with role "packager" |
| Godown | Dropdown | Yes | |
| Product | Dropdown | Yes | |
| Color | Text | Yes | |
| Batch | Dropdown | No | Only if `batchEnabled` |
| Bundle Type | Radio | Yes | Small (X pieces) / Large (Y pieces) — counts from product config |
| Bundle Count | Number (integer) | Yes | Min 1 |
| Work Date | Date picker | No | Defaults to today |
| Notes | Textarea | No | |

**Auto-Calculated** (shown live):
- Total Pieces = Bundle Count × Pieces per Bundle (from product)
- Wage = Bundle Count × Bundle Rate (from product, per type)
- Display: "X bundles × ₹Y = ₹Z wage"

---

## 12. Wages & Advances

### 12.1 Advances

**API**: `GET/POST /api/advances`

**List Screen**:
- Columns: Date, Wager, Type (Given/Deduction/Discretionary), Amount (₹), Balance After (₹)
- Type badges: Given (blue), Deduction (red), Discretionary (green)
- Filters: Wager, Type

**Issue Advance Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Wager | Searchable dropdown | Yes | Show current balance next to each wager |
| Amount (₹) | Currency | Yes | Min ₹0.01 |
| Notes | Textarea | No | |

**UX**: After selecting wager, prominently display: "Current advance balance: ₹X. After this advance: ₹Y"

**Worker View** (Wager self-service):
- Read-only list of own advance transactions
- Current balance card at top
- Breakdown: Original Advance + Additional Advances = Total Balance

### 12.2 Wage Cycles

**API**: `POST /api/wage-cycles/generate`, `GET /api/wage-cycles`, `GET /api/wage-cycles/:id`, `PUT /api/wage-cycles/:id/review`, `PUT /api/wage-cycles/:id/approve`, `PUT /api/wage-cycles/:id/pay`, `PUT /api/wage-cycles/discretionary`, `GET /api/wage-cycles/worker/me`

**List Screen**:
- Columns: Cycle #, Start Date, End Date, Status, Total Payable (₹), Worker Count
- Status badges: Draft (gray), Review (amber), Approved (blue), Paid (green)
- Filter: Status

**Generate Wage Cycle Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Cycle Start Date | Date picker | Yes | |
| Cycle End Date | Date picker | Yes | Typically 7 days from start |
| Advance Deduction Amount (₹) | Currency | No | Default 0. Amount to deduct from each wager's advance |

**Wage Cycle Detail Screen** (the most data-heavy screen):

**Header**:
- Cycle #, Date range, Status, Total Payable
- Status transition buttons (one-tap with confirmation):
  - Draft → "Send for Review" → Review
  - Review → "Approve Wages" → Approved
  - Approved → "Mark as Paid" → Paid

**Wage Records Table**:

| Column | Description |
|--------|-------------|
| Worker Name | Wager/Tailor/Packager/Paavu Oati name |
| Worker Type | Badge (Wager/Tailor/Packager/Paavu Oati) |
| Gross Wage (₹) | Production-based earnings |
| Advance Deduction (₹) | Amount deducted from advance |
| Damage Deduction (₹) | Approved damage deductions |
| Net Payable (₹) | Gross - Advance - Damage |
| Discretionary (₹) | Extra amount (only when net ≤ 0) |
| Actual Paid (₹) | Final amount paid |

**Expandable Row Detail** (per worker):
- Production breakdown: list of production returns with dates, products, quantities, amounts
- Damage breakdown: list of approved damages with dates, grades, deductions
- Advance deduction detail

**Discretionary Payment** (inline action):
- When net payable ≤ 0, show "Add Discretionary" button in the row
- Opens small modal: amount input, explanation text "This amount will be added to the wager's advance balance"
- Only available in Draft/Review status

**Worker Self-Service** (`GET /api/wage-cycles/worker/me`):
- Shows own wage records from paid cycles only
- Card per cycle: Date range, Gross, Deductions, Net Paid
- Tap to expand: detailed breakdown
- "This week" vs "Previous weeks" sections

---

## 13. Sales & Finance

### 13.1 Invoices

**API**: `GET/POST /api/invoices`, `GET /api/invoices/:id`, `PUT /api/invoices/:id`, `PUT /api/invoices/:id/issue`, `PUT /api/invoices/:id/cancel`, `GET /api/invoices/:id/eway-bill`, `GET /api/invoices/customer/:customerId/statement`

**List Screen**:
- Columns: Invoice #, Date, Customer, Total (₹), Paid (₹), Balance Due (₹), Status, Due Date
- Status badges: Draft (gray), Issued (blue), Partially Paid (amber), Paid (green), Overdue (red), Cancelled (strikethrough gray)
- Filters: Customer, Status, Date range
- Overdue invoices highlighted with red background/border
- Sort: Date descending (default)

**Create Invoice Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Customer | Searchable dropdown | Yes | Show customer type + outstanding balance |
| Invoice Date | Date picker | No | Defaults to today |
| E-way Bill Number | Text | No | For consignments above threshold |
| Batch | Dropdown | No | Only if `batchEnabled`. Batch-level invoice |

**Invoice Items** (inline editable table):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Product | Dropdown | Yes | Active products |
| Color | Text | Yes | |
| Quantity | Number (integer) | Yes | Min 1 |
| Unit Price (₹) | Currency | Yes | Auto-filled from product/color price config |
| Batch | Dropdown | No | Per-item batch (if enabled) |

**Auto-Calculated** (shown live, updated on every field change):
- Line Total = Quantity × Unit Price (per item)
- Subtotal = Sum of all line totals
- Tax Type: "Intra-State (CGST + SGST)" or "Inter-State (IGST)" — auto-detected from customer state vs tenant state
- Per-line GST: Line Total × (Product GST Rate / 100)
- CGST Amount (if intra-state): Sum of per-line GST / 2
- SGST Amount (if intra-state): Sum of per-line GST / 2
- IGST Amount (if inter-state): Sum of per-line GST
- **Grand Total** = Subtotal + Total GST
- Due Date = Invoice Date + Customer Credit Period

**Invoice Detail Screen**:
- Header: Invoice #, Customer, Date, Due Date, Status
- Items table with GST breakdown
- Totals section: Subtotal, CGST, SGST, IGST, Grand Total
- Payment history (if any payments recorded)
- Action buttons:
  - Draft: "Edit", "Issue Invoice", "Cancel"
  - Issued: "Record Payment", "Cancel", "Download E-way Bill"
  - Partially Paid: "Record Payment"
  - Paid: view-only
  - Overdue: "Record Payment", highlight days overdue

**Customer Statement Screen** (`GET /api/invoices/customer/:customerId/statement`):
- Header: Customer name, total outstanding
- Chronological ledger: invoices (debits) and payments (credits)
- Running balance column
- Aging summary: 0-30, 30-60, 60-90, 90+ days

### 13.2 Payments

**API**: `GET/POST /api/payments`

**List Screen**:
- Columns: Date, Customer, Invoice #, Amount (₹), Method, Reference #
- Filters: Customer, Invoice, Date range, Payment Method

**Record Payment Form** (can be accessed from invoice detail or standalone):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Invoice | Searchable dropdown | Yes | Shows: Invoice #, Customer, Balance Due. Pre-selected if coming from invoice detail |
| Amount (₹) | Currency | Yes | Show balance due. For bill-to-bill customers: auto-fill with full balance |
| Payment Method | Radio/Chips | Yes | Cash / UPI / Bank Transfer / Cheque / Other |
| Payment Date | Date picker | No | Defaults to today |
| Reference Number | Text | No | e.g., cheque number, UPI transaction ID |
| Notes | Textarea | No | |

**Validation**:
- Amount must not exceed balance due
- Bill-to-bill customers: amount must equal full balance due (show warning if partial)
- Show confirmation: "Record payment of ₹X against Invoice #{number}?"

---

## 14. Notifications & Fraud Alerts

### 14.1 Notifications

**API**: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`

**Bell Icon** (header/tab bar):
- Badge showing unread count
- Tap opens notification panel/screen

**Notification Screen/Panel**:
- Grouped by date (Today, Yesterday, This Week, Earlier)
- Each notification shows:
  - Priority indicator (colored dot: low=gray, medium=blue, high=amber, urgent=red)
  - Title (bold)
  - Message (truncated, expandable)
  - Timestamp (relative: "2h ago", "Yesterday")
  - Read/unread indicator (bold = unread)
- Tap notification → navigates to related entity (invoice, damage record, wage cycle, etc.)
- "Mark all as read" button at top
- Filter by: priority, event type, read/unread

**Push Notifications** (mobile):
- FCM token registered on login (`PUT /api/auth/fcm-token`)
- Notification events trigger push:
  - Damage reported → Owner
  - Wage paid → Worker
  - Invoice overdue → Owner
  - Credit due approaching → Owner
  - Fraud alert → Owner
  - Loom downtime → Owner

### 14.2 Fraud Alerts

**API**: `GET /api/fraud-alerts`, `PUT /api/fraud-alerts/:id/resolve`

**List Screen** (Owner + Staff):
- Columns: Date, Alert Type, Severity, Description, Wager (if applicable), Status
- Severity badges: Low (blue), Medium (amber), High (orange), Critical (red pulsing)
- Filter: Alert Type, Severity, Resolved/Unresolved
- Unresolved shown first, sorted by severity descending

**Alert Detail**:
- Full description of the anomaly
- Linked entity (wager, production return, inventory record)
- Investigation links (navigate to related records)
- "Mark as Resolved" button (Owner only) with confirmation

**Alert Types & What They Show**:

| Alert | Description for UI |
|-------|--------------------|
| Color Substitution | "Wager {name} returned {color_returned} but was issued {color_issued}" |
| Excess Wastage | "Wastage of {X}g exceeds limit of {Y}g for wager {name}" |
| Customer Overdue | "Customer {name} has {N} overdue invoices totaling ₹{X}" |

---

## 15. Reports & Analytics

All report screens share common patterns:
- Date range picker (from/to) at top
- Additional filters specific to each report
- Data table with sortable columns
- Export button (CSV/PDF) — future enhancement
- Refresh button
- Loading skeleton while data loads

### 15.1 Production Reports

**Production Summary** (`GET /api/reports/production-summary`):
- Group by: Day / Week / Month toggle
- Filters: Product, Batch (if enabled)
- Table: Period, Total Pieces, Total Weight (kg), Return Count, Wager Count
- Chart: Line/bar chart of production over time

**Batch Profitability** (`GET /api/reports/batch-profitability`) [if `batchEnabled`]:
- Filters: Date range, Product
- Table: Batch #, Product, Cone Cost (₹), Wage Cost (₹), Revenue (₹), Profit/Loss (₹), Margin (%)
- Profit highlighted green, loss in red

**Color Profitability** (`GET /api/reports/color-profitability`):
- Filters: Date range, Product
- Table: Color, Total Produced (pcs), Revenue (₹), Profit (₹)
- Pie chart of revenue by color

**Product Profitability** (`GET /api/reports/product-profitability`):
- Filters: Date range
- Table: Product, Total Produced, Total Revenue (₹), Total Cost (₹), Profit (₹), Margin (%)

### 15.2 Wager Reports

**Wage Sheet** (`GET /api/reports/wage-sheet/:cycleId`):
- Select wage cycle from dropdown
- Table: Worker Name, Type, Gross (₹), Advance Deduction (₹), Damage Deduction (₹), Net Payable (₹), Discretionary (₹), Actual Paid (₹)
- Summary row: totals for each column
- Print-friendly layout

**Wager Damage Report** (`GET /api/reports/wager-damage`):
- Filters: Date range, Wager
- Table: Wager, Total Damage Count, Minor/Major/Reject breakdown, Total Deduction (₹), Damage %
- Bar chart: damage % by wager

**Wager Utilization** (`GET /api/reports/wager-utilization`):
- Filters: Date range
- Table: Wager, Loom Type, Working Days, Downtime Hours, Expected Production, Actual Production, Utilization %
- Bar chart: utilization % by wager

**Wager Advance Balances** (`GET /api/reports/wager-advance`):
- No date filter (current snapshot)
- Table: Wager, Original Advance (₹), Additional Advances (₹), Total Balance (₹)
- Summary: total outstanding advances

### 15.3 Inventory Reports

**Cone Stock** (`GET /api/reports/cone-stock`):
- Filters: Godown, Product, Color
- Table: Godown, Product, Color, Quantity (kg)
- Summary: total kg across all

**Finished Stock** (`GET /api/reports/finished-stock`):
- Filters: Godown, Stage
- Table: Godown, Product, Color, Stage, Quantity, Weight (kg)
- Grouped by stage with subtotals

**Stock Movement** (`GET /api/reports/stock-movement`):
- Filters: Date range, Godown, Product, Stage
- Table: Date, Product, Color, Stage, Movement Type, Quantity, Reference
- Last 100 movements

### 15.4 Finance Reports

**GST Summary** (`GET /api/reports/gst-summary`):
- Filters: Date range
- Sections: Intra-State (CGST + SGST) and Inter-State (IGST)
- Per section: Invoice Count, Taxable Amount (₹), Tax Amount (₹), Total (₹)
- Grand totals

**Supplier Ledger** (`GET /api/reports/supplier-ledger`):
- Filters: Date range, Supplier
- Table: Supplier, Purchase Count, Total Quantity (kg), Total Amount (₹), GST (₹)
- Detail view per supplier: list of purchases

**Revenue Report** (`GET /api/reports/revenue`):
- Group by: Day / Week / Month toggle
- Filters: Date range, Product
- Table: Period, Invoice Count, Revenue (₹), Collected (₹), Outstanding (₹)
- Line chart: revenue trend

**Customer Aging** (`GET /api/reports/customer-aging`):
- No date filter (current snapshot)
- Table: Customer, Total Outstanding (₹), 0-30 Days (₹), 30-60 Days (₹), 60-90 Days (₹), 90+ Days (₹)
- Summary row: totals per aging bucket
- Color coding: 60-90 = amber, 90+ = red

### 15.5 Performance Reports

**Downtime Report** (`GET /api/reports/downtime`):
- Group by: Reason / Loom / Wager toggle
- Filters: Date range
- Table depends on grouping:
  - By Reason: Reason, Incident Count, Total Hours
  - By Loom: Loom #, Incident Count, Total Hours, Top Reason
  - By Wager: Wager, Incident Count, Total Hours
- Pie chart: downtime by reason

**Shift Production** (`GET /api/reports/shift-production`) [if `shiftEnabled`]:
- Filters: Date range, Product
- Table: Shift, Return Count, Total Pieces, Total Weight (kg), Avg Pieces/Return
- Bar chart: production by shift

---

## 16. Tenant & Platform Administration

### 16.1 Super Admin: Platform Management

**API**: `GET/POST /api/tenants`, `PUT /api/tenants/:id`, `PUT /api/tenants/:id/status`

**Tenant List Screen**:
- Columns: Name, Owner, Phone, State, Status, Created Date
- Status badges: Active (green), Trial (blue), Suspended (red)
- Filters: Status

**Create Tenant Form**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Tenant Name | Text | Yes | Business name |
| Owner Name | Text | Yes | |
| Phone | Phone | Yes | Unique across platform |
| Email | Email | No | |
| Address | Textarea | No | |
| State Code | Dropdown | Yes | Indian states |
| GSTIN | Text | No | |

**Tenant Detail Screen**:
- Profile info (editable)
- Status management: Activate / Suspend with confirmation
- Settings overview (read-only for Super Admin)
- Usage statistics (future enhancement)

### 16.2 Owner: Tenant Settings

**API**: `GET/PUT /api/tenants/:id/settings`

**Settings Screen** (tabs or sections):

**Feature Toggles**:
| Setting | Type | Description |
|---------|------|-------------|
| Batch System | Toggle | Enable/disable batch tracking |
| Shift Tracking | Toggle | Enable/disable shift-wise production |
| Inter-Godown Transfers | Toggle | Enable/disable stock transfers |
| Show Wager Ranking | Toggle | Show/hide rankings to wagers |

**Authentication**:
| Setting | Type | Description |
|---------|------|-------------|
| OTP Login | Toggle | Enable phone OTP authentication |
| PIN Login | Toggle | Enable 4-digit PIN authentication |
| | | Warning: At least one must be enabled |

**Wage Configuration**:
| Setting | Type | Description |
|---------|------|-------------|
| Wage Cycle Day | Dropdown | Sunday through Saturday |
| Rate per Paavu | Currency | Paavu Oati wage rate |

**Damage Deduction Rates**:
| Setting | Type | Description |
|---------|------|-------------|
| Minor Deduction (%) | Number | Default 25% |
| Major Deduction (%) | Number | Default 50% |
| Reject Deduction (%) | Number | Default 100% |

**Other**:
| Setting | Type | Description |
|---------|------|-------------|
| Default Credit Period (days) | Number | Default for new customers |
| Paavu Wastage Limit (g) | Number | Flag threshold |
| Currency | Text | Default INR |
| Locale | Text | Default en |

---

## 17. Settings & Preferences

### 17.1 My Profile

**API**: `GET /api/auth/me`, `PUT /api/auth/pin`

**Screen**:
- Display: Name, Phone, Role, Tenant
- Language preference toggle (English / Tamil)
- PIN management: "Change PIN" / "Set PIN"

---

## 18. Feature Flag Gating

The login response includes `featureFlags`. These control UI visibility:

| Flag | UI Impact When OFF |
|------|-------------------|
| `batchEnabled` | Hide: Batches menu, batch fields in all forms (cone purchase, issuance, production return, tailoring, packaging, invoice items), batch profitability report |
| `shiftEnabled` | Hide: Shifts menu, shift field in production return form, shift wage rates in product config, shift production report |
| `interGodownTransferEnabled` | Hide: Transfers menu item, transfer button in inventory |
| `showWagerRanking` | Hide: Ranking screen from wager self-service (still visible to Owner/Staff) |

**Implementation**: Store feature flags in global state (React Context / Zustand / Redux). All conditional sections check flags before rendering.

---

## 19. Offline & Sync Strategy

### Mobile-Only Concern

**Offline-Capable Operations** (queue when offline):
- Production return creation
- Cone issuance creation
- Damage record creation
- Tailoring record creation
- Packaging record creation
- Loom downtime start/end
- Paavu production creation

**Online-Only Operations**:
- Authentication (OTP/PIN)
- Invoice creation/management
- Payment recording
- Wage cycle operations
- Master data CRUD
- Reports
- Transfers

**UI Indicators**:
- Global offline banner: "You are offline. Changes will sync when connected."
- Pending sync count badge
- Per-item sync status: "Synced" / "Pending sync" / "Sync failed"
- Pull-to-refresh triggers sync attempt

**Sync Strategy**:
- On reconnection: replay queued operations in order
- Conflict resolution: server wins (show conflict notification to user)
- Failed syncs: show error with retry option

---

## 20. i18n & Localization

### Supported Languages
- **English** (`en`) — default
- **Tamil** (`ta`) — full parallel translation (219 keys exist in backend)

### Implementation
- All user-facing strings use translation keys
- Language toggle on: login screen, profile settings, app header
- Number formatting: Indian numbering system (1,00,000 not 100,000)
- Currency: ₹ (INR) prefix
- Date format: DD/MM/YYYY (Indian standard)
- Phone format: +91 XXXXX XXXXX

### Translation Key Structure (matches backend `locales/`)
```
auth.*         — Login, OTP, PIN screens
tenant.*       — Tenant management
users.*        — User management
loomTypes.*    — Loom type labels
looms.*        — Loom labels
products.*     — Product labels
suppliers.*    — Supplier labels
customers.*    — Customer labels
godowns.*      — Godown labels
wagers.*       — Wager labels
batches.*      — Batch labels
inventory.*    — Inventory & stages
production.*   — Production pipeline
damage.*       — Damage management
tailoring.*    — Tailoring labels
packaging.*    — Packaging labels
advances.*     — Advance labels
wages.*        — Wage labels
invoices.*     — Invoice labels
payments.*     — Payment labels
notifications.*— Notification labels
fraudAlerts.*  — Fraud alert labels
reports.*      — Report labels
errors.*       — Error messages
common.*       — Shared labels (save, cancel, delete, etc.)
```

---

## 21. Cross-Cutting UI Patterns

### 21.1 Pagination
- Default: 20 items per page
- Mobile: infinite scroll with "Loading more..." indicator
- Web: page numbers + prev/next buttons at bottom
- Show total count: "Showing 1-20 of 156"

### 21.2 Search & Filters
- Search debounce: 300ms
- Filters in collapsible panel (web) or bottom sheet (mobile)
- Active filter count badge on filter button
- "Clear all filters" option
- Filters persist during session (not across page reloads)

### 21.3 Forms
- Real-time validation (on blur)
- Inline error messages below fields (red text)
- Disabled submit button until form is valid
- Loading state on submit (spinner on button, disable form)
- Success toast notification on save
- Navigate back to list on success
- Unsaved changes warning on navigation away

### 21.4 Confirmation Dialogs
Required for:
- Damage approval/rejection
- Wage cycle status transitions (review → approved → paid)
- Invoice issuance/cancellation
- User deactivation
- Batch status changes
- Advance issuance
- Payment recording

Dialog pattern:
- Title: action being taken
- Body: summary of impact (amounts, affected entities)
- Two buttons: Cancel (secondary) / Confirm (primary, colored by action type)
- For destructive actions: "Cancel" (red primary button)

### 21.5 Error Handling
- API errors shown as toast/snackbar notifications
- Validation errors (400): show inline field errors
- Auth errors (401): redirect to login
- Permission errors (403): show "Access denied" screen
- Not found (404): show "Not found" screen with back button
- Server errors (500): show "Something went wrong" with retry button

### 21.6 Loading States
- Skeleton screens for lists and dashboards
- Spinner for individual actions
- Progress bar for multi-step operations
- Optimistic updates where safe (mark notification as read)

### 21.7 Empty States
- Illustrated empty state per module ("No invoices yet", "No production records")
- CTA button to create first item
- Context-appropriate illustrations

### 21.8 Data Tables (Web)
- Sortable column headers
- Row hover highlight
- Row click → navigate to detail
- Sticky header on scroll
- Responsive: collapse to cards on small screens

### 21.9 Number & Currency Formatting
- Currency: `₹1,23,456.78` (Indian comma grouping)
- Weight: `45.5 kg` or `250 g`
- Count: `1,234 pieces`
- Percentage: `85.2%`
- All numeric displays use monospace or tabular-nums font variant

---

## Appendix: API Endpoint Quick Reference

| Module | Endpoints | Methods |
|--------|-----------|---------|
| Auth | `/api/auth/*` | POST, PUT, GET |
| Tenants | `/api/tenants/*` | GET, POST, PUT |
| Users | `/api/users/*` | GET, POST, PUT |
| Loom Types | `/api/loom-types/*` | GET, POST, PUT |
| Looms | `/api/looms/*` | GET, POST, PUT |
| Products | `/api/products/*` | GET, POST, PUT, DELETE |
| Suppliers | `/api/suppliers/*` | GET, POST, PUT |
| Customers | `/api/customers/*` | GET, POST, PUT |
| Godowns | `/api/godowns/*` | GET, POST, PUT |
| Wagers | `/api/wagers/*` | GET, POST, PUT |
| Batches | `/api/batches/*` | GET, POST, PUT |
| Cone Purchases | `/api/cone-purchases/*` | GET, POST |
| Inventory | `/api/inventory/*` | GET |
| Transfers | `/api/transfers/*` | GET, POST |
| Cone Issuances | `/api/cone-issuances/*` | GET, POST |
| Paavu Productions | `/api/paavu-productions/*` | GET, POST |
| Production Returns | `/api/production-returns/*` | GET, POST |
| Loom Downtimes | `/api/loom-downtimes/*` | GET, POST, PUT |
| Shifts | `/api/shifts/*` | GET, POST, PUT |
| Damage Records | `/api/damage-records/*` | GET, POST, PUT |
| Tailoring Records | `/api/tailoring-records/*` | GET, POST |
| Packaging Records | `/api/packaging-records/*` | GET, POST |
| Advances | `/api/advances/*` | GET, POST |
| Wage Cycles | `/api/wage-cycles/*` | GET, POST, PUT |
| Invoices | `/api/invoices/*` | GET, POST, PUT |
| Payments | `/api/payments/*` | GET, POST |
| Notifications | `/api/notifications/*` | GET, PUT |
| Fraud Alerts | `/api/fraud-alerts/*` | GET, PUT |
| Reports | `/api/reports/*` | GET |
| Health | `/api/health` | GET |

---

*This document covers all UI functionality required for the Powerloom ERP web and mobile clients, derived from the complete backend API surface of 30 modules and ~80 endpoints.*
