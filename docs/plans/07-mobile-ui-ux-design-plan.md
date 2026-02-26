# Powerloom ERP — Mobile UI/UX Design Plan

> **Platform**: React Native (Expo) — iOS + Android from a single codebase
> **Source of truth**: `docs/ui-functionality-spec.md`, `docs/powerloom-erp-v3.md`, `docs/questions.txt`
> **Design target**: 40+ year old, non-tech-savvy powerloom operators in Tamil Nadu, India

---

## Table of Contents

1. [Design Philosophy & Guiding Principles](#1-design-philosophy--guiding-principles)
2. [User Personas & Role-Based Experiences](#2-user-personas--role-based-experiences)
3. [Platform-Specific Design Considerations](#3-platform-specific-design-considerations)
4. [Design System Foundation](#4-design-system-foundation)
5. [Navigation Architecture](#5-navigation-architecture)
6. [Screen Inventory & Priority Matrix](#6-screen-inventory--priority-matrix)
7. [Core User Flows](#7-core-user-flows)
8. [Screen-by-Screen Design Specifications](#8-screen-by-screen-design-specifications)
9. [Component Library](#9-component-library)
10. [Accessibility & Inclusive Design](#10-accessibility--inclusive-design)
11. [Localization (i18n) Design](#11-localization-i18n-design)
12. [Offline Experience Design](#12-offline-experience-design)
13. [Motion & Feedback Design](#13-motion--feedback-design)
14. [Design Deliverables & Phased Roadmap](#14-design-deliverables--phased-roadmap)
15. [Design Tool Recommendations](#15-design-tool-recommendations)

---

## 1. Design Philosophy & Guiding Principles

### The Core Problem

Users are textile mill owners, wagers (loom operators), tailors, and packagers — primarily **40+ years old, working in dusty factory environments**, using mid-range Android phones (with a smaller % on iPhone). They are comfortable with WhatsApp and phone calls but struggle with complex app interfaces.

### Design Principles

| # | Principle | What It Means |
|---|-----------|---------------|
| 1 | **Forgiving by default** | Large tap zones (48dp+), undo-friendly, confirmation on destructive actions. Assume thumbs, not precision styluses. |
| 2 | **Numbers first** | Dashboard cards show big, bold numbers. The owner glances at production, wages, and due payments — text is secondary. |
| 3 | **One thing per screen** | Each screen has ONE primary task. No multi-panel complexity. Wizard-style multi-step over dense single forms. |
| 4 | **Auto-calculate, don't ask** | If the system CAN compute a field, it should. Show the result, let users override if needed. Fewer inputs = fewer errors. |
| 5 | **Always show context** | When recording production, show the wager's type, rate, and assigned looms inline. Don't force users to remember or navigate away. |
| 6 | **Bilingual native** | Every screen works equally well in English and Tamil. No layout breakage when switching languages. |
| 7 | **Offline-safe** | Never block a factory-floor action because of connectivity. Queue writes, show sync status, resolve conflicts gracefully. |
| 8 | **Respectful of age** | High contrast, large fonts (16sp body minimum, 20sp headers), avoid gesture-only interactions, always provide button alternatives. |

---

## 2. User Personas & Role-Based Experiences

### 2.1 Persona: Owner (Murugan, 52)

- **Device**: Samsung Galaxy A54 (Android 13) or iPhone 12
- **Usage**: 30-60 min/day, morning review + evening approvals
- **Needs**: Quick dashboard scan, approve damages, review wages, check overdue payments
- **Pain points**: Small text, too many taps to reach key info, doesn't want to learn complex UI
- **Mobile tasks**: Dashboard review, damage approvals, wage cycle transitions, quick production entry, invoice status

### 2.2 Persona: Staff (Karthik, 35)

- **Device**: Redmi Note 12 (Android)
- **Usage**: 2-4 hours/day at godown
- **Needs**: Record cone issuances, production returns, manage inventory
- **Pain points**: Repeated data entry, offline coverage at godown
- **Mobile tasks**: Cone issuance, production returns, inventory checks, damage recording

### 2.3 Persona: Wager (Selvaraj, 48)

- **Device**: Budget Android (Realme C30, Android 12 Go edition)
- **Usage**: 5-10 min/day, checking production and wages
- **Needs**: See what he produced, check his wage, view advance balance
- **Pain points**: Very low tech literacy, reads Tamil primarily, small screen
- **Mobile tasks**: View dashboard, check production history, view wages, view advances

### 2.4 Persona: Tailor (Lakshmi, 45)

- **Device**: Budget Android
- **Usage**: 2-5 min/week, checking wages
- **Needs**: See stitch/knot counts, weekly wage
- **Mobile tasks**: View work records, check wage breakdown

### 2.5 Persona: Packager (Kumar, 50)

- **Device**: Budget Android
- **Usage**: 2-5 min/week
- **Needs**: See bundle counts, weekly wage
- **Mobile tasks**: View work records, check wage breakdown

### Role-Experience Summary

| Aspect | Owner/Staff | Wager/Tailor/Packager |
|--------|------------|----------------------|
| Read/Write | Full CRUD | Read-only (own data) |
| Navigation depth | 5 tabs + nested stacks | 4-5 tabs, flat |
| Form complexity | Multi-field forms | No forms |
| Offline needs | Queue writes | Read cache sufficient |
| Language | English or Tamil | Primarily Tamil |
| Device tier | Mid-range+ | Budget (512MB-2GB RAM) |

---

## 3. Platform-Specific Design Considerations

The app is built with **React Native (Expo)** — a single codebase — but must feel native on both platforms.

### 3.1 iOS Considerations (Apple HIG)

| Pattern | iOS Approach |
|---------|-------------|
| **Navigation** | Large title navigation bar, back button with text, edge-swipe-back gesture |
| **Tab bar** | Bottom tab bar with SF Symbol-style icons, labels always visible |
| **Lists** | Inset grouped list style, swipe actions (trailing delete, leading actions) |
| **Actions** | Action sheets (`.actionSheet`) for destructive confirmations |
| **Modals** | Sheet presentation (`.sheet`) for create/edit forms, half-sheet for filters |
| **Typography** | San Francisco font, Dynamic Type support |
| **Colors** | System semantic colors that adapt to light/dark mode |
| **Search** | Inline search bar that collapses into navigation bar |
| **Haptics** | Light haptic on tap confirmations, medium on status transitions |
| **Safe areas** | Respect notch, Dynamic Island, home indicator areas |

### 3.2 Android Considerations (Material Design 3)

| Pattern | Android Approach |
|---------|-----------------|
| **Navigation** | Top app bar (collapsing), bottom navigation bar |
| **Tab bar** | NavigationBar (Material 3) with filled/outlined icons |
| **Lists** | Full-width list items, ripple effect on touch |
| **Actions** | AlertDialog for confirmations, bottom sheets for selections |
| **Modals** | Full-screen dialog or bottom sheet for create/edit forms |
| **Typography** | Roboto / system font, Material 3 type scale |
| **Colors** | Material You dynamic color (Android 12+), fallback static theme |
| **Search** | SearchBar (Material 3) expanding from top app bar |
| **Feedback** | Ripple effects, snackbar for transient messages |
| **Back** | System back button/gesture, predictive back animation |

### 3.3 Shared Cross-Platform Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tab bar position | **Bottom** (both platforms) | iOS standard; Android M3 supports bottom nav. Thumb-reachable for 40+ users |
| Form style | **Full-screen** (both) | More space for large inputs, consistent cross-platform |
| Confirmation | **Platform-native dialogs** | iOS: Action Sheet; Android: AlertDialog. Use `Alert.alert()` in RN |
| Fonts | **System default** | SF Pro on iOS, Roboto on Android. Respect platform identity |
| Icons | **Single icon set** (outline + filled variants) | React Native Vector Icons or custom SVG icon set. Consistent across platforms |
| Pull-to-refresh | **Both platforms** | Native behavior on both |

---

## 4. Design System Foundation

### 4.1 Color Palette

#### Primary Brand Colors

```
Primary:          #1B5E20  (Dark Green — textile/nature association)
Primary Light:    #4C8C4A
Primary Dark:     #003300
On Primary:       #FFFFFF

Secondary:        #0D47A1  (Deep Blue — trust/reliability)
Secondary Light:  #5472D3
Secondary Dark:   #002171
On Secondary:     #FFFFFF
```

#### Semantic Status Colors

| Status | Light Mode | Dark Mode | Usage |
|--------|-----------|-----------|-------|
| Success / Active | `#2E7D32` | `#81C784` | Operational looms, paid wages, active status |
| Warning / Pending | `#F57F17` | `#FFD54F` | Pending approvals, draft cycles, review status |
| Error / Critical | `#C62828` | `#EF9A9A` | Overdue invoices, rejected items, fraud alerts |
| Info / Completed | `#1565C0` | `#64B5F6` | Approved items, issued invoices, completed |
| Neutral / Inactive | `#616161` | `#9E9E9E` | Inactive, closed, idle |

#### Inventory Stage Colors (consistent across all screens)

| Stage | Color | Hex |
|-------|-------|-----|
| Raw Cone | Brown | `#795548` |
| Paavu | Indigo | `#3F51B5` |
| Woven | Teal | `#00897B` |
| Tailored | Purple | `#7B1FA2` |
| Bundled | Orange | `#EF6C00` |
| Sold | Green | `#2E7D32` |

#### Surface & Background

```
Background:       #FAFAFA  (light) / #121212  (dark)
Surface:          #FFFFFF  (light) / #1E1E1E  (dark)
Surface Variant:  #F5F5F5  (light) / #2C2C2C  (dark)
Outline:          #E0E0E0  (light) / #424242  (dark)
```

### 4.2 Typography Scale

All sizes are in `sp` (scalable pixels) for accessibility.

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 32sp | Bold | 40sp | Dashboard hero numbers (₹1,23,456) |
| Heading 1 | 24sp | Bold | 32sp | Screen titles |
| Heading 2 | 20sp | SemiBold | 28sp | Section headers, card titles |
| Body Large | 18sp | Regular | 26sp | Data-heavy content, numbers in tables |
| Body | 16sp | Regular | 24sp | Standard body text (MINIMUM for this app) |
| Body Small | 14sp | Regular | 20sp | Secondary/supporting text only |
| Caption | 12sp | Medium | 16sp | Timestamps, labels above fields |
| Monospace Numbers | 18sp+ | Medium | 26sp | Currency values, weights, counts |

**Number formatting font**: Use `tabularNums` / monospace variant for all numeric data to ensure column alignment.

**Tamil typography**: Tamil Unicode glyphs are taller — allocate **~15% more line height** when Tamil is active.

### 4.3 Spacing & Layout Grid

```
Base unit:        4dp
Spacing scale:    4, 8, 12, 16, 20, 24, 32, 40, 48dp
Screen padding:   16dp horizontal
Card padding:     16dp all sides
List item height: 64dp minimum (for 48dp touch target + padding)
FAB size:         56dp (standard) or 72dp (extended)
```

### 4.4 Elevation & Shadows

| Level | Elevation | Usage |
|-------|-----------|-------|
| 0 | 0dp | Background |
| 1 | 1dp | Cards, list items |
| 2 | 3dp | Sticky headers, bottom bar |
| 3 | 6dp | FAB, dialogs |
| 4 | 8dp | Bottom sheets, modals |

### 4.5 Border Radius

```
Small:   8dp   (chips, badges)
Medium:  12dp  (cards, inputs)
Large:   16dp  (bottom sheets, modals)
Full:    999dp (pills, avatars)
```

---

## 5. Navigation Architecture

### 5.1 Owner/Staff Navigation

```
Bottom Tab Bar (5 tabs):
┌───────────┬────────────┬───────────┬────────┬────────┐
│ Dashboard │ Production │ Inventory │ Sales  │  More  │
└───────────┴────────────┴───────────┴────────┴────────┘

Tab 1: Dashboard
  └→ Dashboard (cards grid)
       └→ Deep links to specific screens

Tab 2: Production
  └→ Production Hub (quick action cards)
       ├→ Cone Issuances (list → create)
       ├→ Paavu Production (list → create)
       ├→ Production Returns (list → create)
       ├→ Loom Downtimes (list → create/end)
       ├→ Batches (list → detail → status change) [if batchEnabled]
       └→ Shifts (list → create/edit) [if shiftEnabled]

Tab 3: Inventory
  └→ Stock Overview (summary cards + detailed list)
       ├→ Movement History (per item)
       ├→ Cone Purchases (list → create)
       └→ Transfers (list → create) [if interGodownTransferEnabled]

Tab 4: Sales
  └→ Sales Hub
       ├→ Invoices (list → detail/create)
       │    └→ Record Payment (from invoice)
       ├→ Payments (list → create)
       └→ Customer Statements (per customer)

Tab 5: More
  └→ Menu List
       ├→ Wages
       │    ├→ Advances (list → create)
       │    └→ Wage Cycles (list → detail → transitions)
       ├→ Quality
       │    └→ Damage Records (list → create → approve/reject)
       ├→ Post-Production
       │    ├→ Tailoring Records (list → create)
       │    └→ Packaging Records (list → create)
       ├→ Master Data
       │    ├→ Loom Types / Looms / Products / Suppliers
       │    ├→ Customers / Godowns / Wagers
       │    └→ Users & Permissions
       ├→ Reports (grouped sub-menu)
       ├→ Fraud Alerts (list → detail → resolve)
       ├→ Notifications
       └→ Settings (tenant settings, profile)
```

### 5.2 Wager Navigation

```
Bottom Tab Bar (5 tabs):
┌──────┬───────────────┬──────────┬─────────────┬───────────────┐
│ Home │ My Production │ My Wages │ My Advances │ Notifications │
└──────┴───────────────┴──────────┴─────────────┴───────────────┘

Tab 1: Home
  └→ Self-service dashboard (profile, this week's summary, recent damages)

Tab 2: My Production
  └→ Production return list (own records, read-only)
       └→ Detail view per return

Tab 3: My Wages
  └→ Wage cycle list (own paid cycles)
       └→ Cycle detail (breakdown: gross, deductions, net)

Tab 4: My Advances
  └→ Advance transaction list (own records, read-only)
       └→ Balance summary card at top

Tab 5: Notifications
  └→ Notification list (own notifications)
```

### 5.3 Tailor Navigation

```
Bottom Tab Bar (4 tabs):
┌──────┬─────────┬──────────┬───────────────┐
│ Home │ My Work │ My Wages │ Notifications │
└──────┴─────────┴──────────┴───────────────┘

Tab 1: Home → Dashboard (name, this week's stitch/knot count, wage estimate)
Tab 2: My Work → Tailoring record list (own, read-only)
Tab 3: My Wages → Wage cycle list (own paid cycles)
Tab 4: Notifications → Notification list
```

### 5.4 Packager Navigation

```
Bottom Tab Bar (4 tabs):
┌──────┬─────────┬──────────┬───────────────┐
│ Home │ My Work │ My Wages │ Notifications │
└──────┴─────────┴──────────┴───────────────┘

Tab 1: Home → Dashboard (name, this week's bundle count, wage estimate)
Tab 2: My Work → Packaging record list (own, read-only)
Tab 3: My Wages → Wage cycle list (own paid cycles)
Tab 4: Notifications → Notification list
```

### 5.5 Navigation UX Rules

1. **Tab badges**: Notification tab shows unread count. Dashboard tab shows pending approval count for Owner.
2. **Deep links from notifications**: Tap a notification → navigate directly to the relevant record.
3. **Header bar**: Persistent across all screens:
   - Left: Back arrow (on stack screens) or Tenant name (on tab root screens)
   - Right: Notification bell (with badge) + Language toggle
4. **Stack navigation**: Each tab maintains its own navigation stack (standard React Navigation pattern).
5. **No hamburger menu**: Bottom tabs + "More" tab. No hidden navigation drawers.

---

## 6. Screen Inventory & Priority Matrix

### Priority Levels

- **P0**: Must have for launch — core daily operations
- **P1**: Important for launch — weekly/periodic operations
- **P2**: Nice to have — can follow shortly after launch
- **P3**: Future enhancement

### Complete Screen List

| # | Screen | Role(s) | Priority | Complexity | Notes |
|---|--------|---------|----------|------------|-------|
| **Authentication** |
| 1 | Login (Phone + OTP/PIN) | All | P0 | Medium | Adaptive OTP/PIN flow |
| 2 | PIN Setup | All | P0 | Low | First-time PIN creation |
| **Owner/Staff Screens** |
| 3 | Owner Dashboard | Owner | P0 | High | 6 data cards + quick actions |
| 4 | Staff Dashboard | Staff | P0 | High | Permission-filtered version |
| 5 | Production Returns (list) | Owner/Staff | P0 | Medium | Core daily screen |
| 6 | Production Return (create) | Owner/Staff | P0 | High | Dynamic form (wager type) |
| 7 | Cone Issuances (list) | Owner/Staff | P0 | Medium | |
| 8 | Cone Issuance (create) | Owner/Staff | P0 | Medium | Stock availability check |
| 9 | Stock Overview | Owner/Staff | P0 | High | Summary + detailed table |
| 10 | Damage Records (list) | Owner/Staff | P0 | Medium | Approval queue prominent |
| 11 | Damage Record (create) | Owner/Staff | P0 | Medium | Auto-calculate deductions |
| 12 | Damage Approval | Owner | P0 | Medium | Batch approve capability |
| 13 | Wage Cycles (list) | Owner/Staff | P1 | Medium | Weekly operation |
| 14 | Wage Cycle (detail) | Owner/Staff | P1 | Very High | Most data-heavy screen |
| 15 | Wage Cycle (generate) | Owner/Staff | P1 | Medium | |
| 16 | Advances (list) | Owner/Staff | P1 | Low | |
| 17 | Advance (create) | Owner/Staff | P1 | Low | Balance display |
| 18 | Invoices (list) | Owner/Staff | P1 | Medium | Status color coding |
| 19 | Invoice (create) | Owner/Staff | P1 | Very High | Line items + GST calc |
| 20 | Invoice (detail) | Owner/Staff | P1 | High | Actions by status |
| 21 | Payments (list) | Owner/Staff | P1 | Low | |
| 22 | Payment (create) | Owner/Staff | P1 | Medium | Bill-to-bill validation |
| 23 | Customer Statement | Owner/Staff | P2 | Medium | Ledger + aging |
| 24 | Paavu Production (list) | Owner/Staff | P1 | Medium | |
| 25 | Paavu Production (create) | Owner/Staff | P1 | Medium | Wastage flagging |
| 26 | Loom Downtimes (list) | Owner/Staff | P1 | Medium | Active downtimes pulsing |
| 27 | Loom Downtime (create/end) | Owner/Staff | P1 | Low | |
| 28 | Tailoring Records (list) | Owner/Staff | P1 | Medium | |
| 29 | Tailoring Record (create) | Owner/Staff | P1 | Medium | Auto-calc wage |
| 30 | Packaging Records (list) | Owner/Staff | P1 | Medium | |
| 31 | Packaging Record (create) | Owner/Staff | P1 | Medium | Auto-calc wage |
| 32 | Cone Purchases (list) | Owner/Staff | P1 | Medium | |
| 33 | Cone Purchase (create) | Owner/Staff | P1 | Medium | Auto-calc totals |
| 34 | Transfers (list) | Owner/Staff | P2 | Low | Feature-flagged |
| 35 | Transfer (create) | Owner/Staff | P2 | Medium | Stock availability |
| 36 | Batches (list) | Owner/Staff | P2 | Low | Feature-flagged |
| 37 | Batch (detail) | Owner/Staff | P2 | High | Linked operations |
| 38 | Shifts (list/CRUD) | Owner/Staff | P2 | Low | Feature-flagged |
| 39 | Notifications | Owner/Staff | P0 | Medium | Grouped + deep links |
| 40 | Fraud Alerts (list) | Owner/Staff | P1 | Medium | Severity-based |
| 41 | Fraud Alert (detail) | Owner/Staff | P1 | Medium | Investigation links |
| **Master Data (Owner/Staff)** |
| 42 | Loom Types (list + CRUD) | Owner/Staff | P1 | Low | |
| 43 | Looms (list + CRUD) | Owner/Staff | P1 | Medium | Wager assignment |
| 44 | Products (list) | Owner/Staff | P1 | Low | |
| 45 | Product (create/edit) | Owner/Staff | P1 | Very High | Most complex form |
| 46 | Suppliers (list + CRUD) | Owner/Staff | P1 | Low | |
| 47 | Customers (list + CRUD) | Owner/Staff | P1 | Medium | Type explanation tooltips |
| 48 | Godowns (list + CRUD) | Owner/Staff | P1 | Low | |
| 49 | Wagers (list) | Owner/Staff | P1 | Medium | |
| 50 | Wager (detail - tabs) | Owner/Staff | P1 | High | 6 tabs |
| 51 | Wager (create) | Owner/Staff | P1 | Medium | Type selection UX |
| 52 | Wager Ranking | Owner/Staff | P2 | Medium | Feature-flagged |
| 53 | Users (list + CRUD) | Owner/Staff | P1 | Medium | |
| 54 | User Permissions | Owner | P1 | Medium | Toggle grid |
| **Settings** |
| 55 | Tenant Settings | Owner | P2 | High | Multi-section form |
| 56 | My Profile | All | P1 | Low | |
| **Reports** |
| 57 | Production Summary | Owner/Staff | P2 | High | Chart + table |
| 58 | Batch Profitability | Owner/Staff | P2 | Medium | Feature-flagged |
| 59 | Color Profitability | Owner/Staff | P2 | Medium | |
| 60 | Product Profitability | Owner/Staff | P2 | Medium | |
| 61 | Wage Sheet | Owner/Staff | P2 | Medium | Print-friendly |
| 62 | Wager Damage Report | Owner/Staff | P2 | Medium | |
| 63 | Wager Utilization | Owner/Staff | P2 | Medium | |
| 64 | Wager Advance Balances | Owner/Staff | P2 | Low | |
| 65 | Cone Stock | Owner/Staff | P2 | Low | |
| 66 | Finished Stock | Owner/Staff | P2 | Medium | |
| 67 | Stock Movement | Owner/Staff | P2 | Medium | |
| 68 | GST Summary | Owner/Staff | P2 | Medium | |
| 69 | Supplier Ledger | Owner/Staff | P2 | Medium | |
| 70 | Revenue Report | Owner/Staff | P2 | Medium | Chart |
| 71 | Customer Aging | Owner/Staff | P2 | Medium | Color-coded buckets |
| 72 | Downtime Report | Owner/Staff | P2 | Medium | |
| 73 | Shift Production | Owner/Staff | P2 | Medium | Feature-flagged |
| **Worker Self-Service** |
| 74 | Wager Dashboard | Wager | P0 | Medium | |
| 75 | Tailor Dashboard | Tailor | P0 | Low | |
| 76 | Packager Dashboard | Packager | P0 | Low | |
| 77 | My Production (Wager) | Wager | P0 | Low | Read-only list |
| 78 | My Work (Tailor) | Tailor | P0 | Low | Read-only list |
| 79 | My Work (Packager) | Packager | P0 | Low | Read-only list |
| 80 | My Wages (All workers) | All workers | P0 | Medium | Cycle breakdown |
| 81 | My Advances (Wager) | Wager | P0 | Low | Balance + history |
| 82 | My Damages (Wager) | Wager | P0 | Low | Read-only list |

**Total: 82 screens** (~45 unique design templates, rest are list/detail variants)

---

## 7. Core User Flows

### 7.1 Authentication Flow

```
App Launch
  │
  ├─ Has valid token? ──→ Yes ──→ Role-based Dashboard
  │
  └─ No ──→ Login Screen
              │
              ├─ Enter Phone (+91 XXXXX XXXXX)
              │
              ├─ Tenant supports both OTP & PIN?
              │    ├─ Yes → Show toggle: "Login with OTP" / "Login with PIN"
              │    ├─ OTP only → OTP flow
              │    └─ PIN only → PIN flow
              │
              ├─ OTP Flow:
              │    Enter phone → Tap "Send OTP" → 6-digit input → Verify → Dashboard
              │    (Timer: 5 min. Resend after 30s. Max 5/hour.)
              │
              └─ PIN Flow:
                   Enter phone → 4-digit masked input → Verify → Dashboard
                   (First-time user → PIN Setup screen first)
```

### 7.2 Daily Production Return Flow (Owner/Staff — most used flow)

```
Dashboard
  │
  └─ Tap "Record Production Return" (quick action)
     OR Production tab → "+" button
       │
       ├─ Step 1: Select Wager (searchable dropdown)
       │    → System shows: Wager name, type badge, assigned looms, wage rate
       │
       ├─ Step 2: Select Loom (filtered to wager's assigned looms)
       │    → Auto-fill Product if loom has single assignment
       │
       ├─ Step 3: Enter Return Data
       │    ├─ Type 1/3 wager: Weight field PROMINENT, count field optional
       │    └─ Type 2/4 wager: Count field PROMINENT, weight field optional
       │    → Show inline: "Rate: ₹X per kg" or "Rate: ₹X per piece"
       │    → Show inline: "Estimated wage: ₹Y"
       │    → Optional: Godown, Color, Batch (if enabled), Shift (if enabled)
       │
       ├─ Step 4: Review & Confirm
       │    → Summary card with all values
       │    → "Save" button (large, green, bottom-sticky)
       │
       └─ Success → Toast "Production return saved" → Back to list
```

### 7.3 Damage Approval Flow (Owner)

```
Dashboard → "Pending Approvals" card (showing count)
  │
  └─ Pending Damage Records list
       │
       ├─ Each card shows:
       │    Wager name, Product, Grade badge, Count, Deduction ₹
       │
       ├─ Swipe right → Approve (green)
       ├─ Swipe left → Reject (red)
       │    OR
       ├─ Tap card → Detail view
       │    → Full info + production return link
       │    → Two large buttons: [Approve ✓] [Reject ✗]
       │
       ├─ Confirmation dialog:
       │    "Approve deduction of ₹X from Selvaraj?"
       │    [Cancel] [Approve]
       │
       └─ Batch mode: Select multiple → "Approve All (N)" button
```

### 7.4 Wage Cycle Flow (Owner)

```
More tab → Wages → Wage Cycles
  │
  ├─ Generate New Cycle
  │    → Date range picker (start + end)
  │    → Advance deduction amount
  │    → "Generate" → Processing spinner → Draft cycle created
  │
  └─ Cycle Detail (most complex screen)
       │
       ├─ Header: Cycle #, dates, status badge, total payable
       │
       ├─ Status transitions (large single-tap buttons):
       │    Draft → [Send for Review] → Review
       │    Review → [Approve Wages] → Approved
       │    Approved → [Mark as Paid] → Paid
       │    (Each with confirmation dialog showing total amount)
       │
       ├─ Worker List (scrollable):
       │    Per worker row:
       │      Name | Type badge | Gross | Deductions | Net | Paid
       │      └─ Tap to expand: Production breakdown, damage list, advance detail
       │      └─ If net ≤ 0: "Add Discretionary" button
       │
       └─ Summary footer: Total workers, total payable, total deductions
```

### 7.5 Wager Self-Service Flow

```
Login (Tamil default)
  │
  └─ Wager Dashboard
       │
       ├─ "My Profile" card → Name, phone, type, assigned looms
       │
       ├─ "This Week" card → Pieces/kg returned, count of returns
       │    → Tap → My Production list (this cycle's records)
       │
       ├─ "Last Wage" card → ₹ net paid, cycle dates
       │    → Tap → Wage breakdown detail
       │
       ├─ "Advance Balance" card → ₹ current balance
       │    → Tap → Advance transaction history
       │
       ├─ "Damages" card → Count pending/approved this month
       │    → Tap → Damage records list
       │
       └─ "Performance" card (if showWagerRanking) → Utilization %, rank
```

### 7.6 Invoice Creation Flow (Owner/Staff)

```
Sales tab → Invoices → "+" (Create)
  │
  ├─ Step 1: Select Customer
  │    → Show: Customer name, type badge, outstanding balance, credit period
  │    → Auto-detect GST type (intra/inter-state)
  │
  ├─ Step 2: Add Line Items
  │    → Repeating section:
  │      [Product dropdown] [Color] [Qty] [Unit Price (auto-fill)] [Line Total]
  │    → "Add Item" button
  │    → Running totals at bottom: Subtotal, GST breakdown, Grand Total
  │
  ├─ Step 3: Review
  │    → Full invoice preview
  │    → GST detail: CGST + SGST (intra) or IGST (inter)
  │    → Due date auto-calculated
  │    → [Save as Draft] or [Save & Issue]
  │
  └─ Success → Invoice detail screen
```

---

## 8. Screen-by-Screen Design Specifications

### 8.1 Login Screen

**Layout**:
```
┌─────────────────────────────┐
│         [EN | தமிழ்]    ← Language toggle (top-right)
│                             │
│       [App Logo/Name]       │
│    "Powerloom ERP"          │
│                             │
│  ┌─────────────────────┐    │
│  │ +91 │ Mobile Number  │    │
│  └─────────────────────┘    │
│                             │
│  [Login with OTP] / [PIN]   │  ← Toggle if both enabled
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   SEND OTP (48dp+)  │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  ← OTP Screen:             │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐  │
│  │ │ │ │ │ │ │ │ │ │ │ │  │  ← 6 large digit boxes
│  └─┘ └─┘ └─┘ └─┘ └─┘ └─┘  │
│                             │
│  Expires in 4:32            │
│  [Resend OTP] (after 30s)  │
│                             │
│  Error: "Invalid OTP" (red) │
└─────────────────────────────┘
```

**Key design decisions**:
- Phone field: Large, centered, +91 prefix locked
- OTP digits: 48dp x 48dp boxes, 8dp gap, auto-advance to next box
- PIN digits: 48dp x 48dp, masked with dots
- Full-width button, minimum 48dp height, bold text
- Error states: red text below relevant field, shake animation

### 8.2 Owner Dashboard

**Layout** (vertical scroll):
```
┌─────────────────────────────────┐
│ Powerloom ERP     🔔 3   [EN]  │  ← Header
├─────────────────────────────────┤
│                                 │
│  Good morning, Murugan 👋       │
│  Wednesday, 19 Feb 2026         │
│                                 │
│  ┌──────────────┬──────────────┐│
│  │ Today's      │ Pending      ││
│  │ Production   │ Approvals    ││
│  │              │              ││
│  │  156 pcs     │  8 damages   ││
│  │  234.5 kg    │  1 wage cycle││
│  │  12 wagers   │              ││
│  └──────────────┴──────────────┘│
│                                 │
│  ┌──────────────┬──────────────┐│
│  │ Inventory    │ Payment Due  ││
│  │ Snapshot     │              ││
│  │              │              ││
│  │ [mini chart] │  5 overdue   ││
│  │              │  ₹2,45,000   ││
│  └──────────────┴──────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ ⚠ Fraud Alerts         3 → ││
│  │ 1 Critical, 2 High         ││
│  └─────────────────────────────┘│
│                                 │
│  Quick Actions                  │
│  ┌────────┐ ┌────────┐         │
│  │ Record │ │ Issue  │         │
│  │Return  │ │ Cones  │         │
│  ├────────┤ ├────────┤         │
│  │Create  │ │ Manage │         │
│  │Invoice │ │ Wages  │         │
│  └────────┘ └────────┘         │
│                                 │
└─────────────────────────────────┘
```

**Card design rules**:
- Each card: 12dp corner radius, 1dp elevation, 16dp padding
- Primary number: Display style (32sp, bold, monospace)
- Secondary label: Body style (16sp, gray)
- Cards are tappable → navigate to relevant list screen
- Quick action buttons: 72dp height, icon (24dp) + label, outlined style

### 8.3 Worker Self-Service Dashboard (Wager)

**Layout** (simplified, Tamil-friendly):
```
┌─────────────────────────────────┐
│ வணக்கம், செல்வராஜ்    🔔 1 [த] │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────────┐│
│  │ 👤 என் விவரம்              ││
│  │                             ││
│  │ Type 1 — Own Loom           ││
│  │ Looms: L-003, L-007         ││
│  │ Phone: +91 98765 43210      ││
│  └─────────────────────────────┘│
│                                 │
│  ┌──────────────┬──────────────┐│
│  │ This Week    │ Last Wage    ││
│  │              │              ││
│  │  45 pcs      │  ₹ 8,450    ││
│  │  67.2 kg     │  Feb 9-15    ││
│  └──────────────┴──────────────┘│
│                                 │
│  ┌──────────────┬──────────────┐│
│  │ Advance      │ Damages      ││
│  │ Balance      │ This Month   ││
│  │              │              ││
│  │  ₹ 12,500   │  2 pending   ││
│  │              │  1 approved  ││
│  └──────────────┴──────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ Performance          85.2%  ││
│  │ ████████████████░░░░        ││
│  │ Rank: 3 of 18              ││
│  └─────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

### 8.4 Production Return Create Form

**Layout** (adaptive based on wager type):
```
┌─────────────────────────────────┐
│  ← Record Production Return     │
├─────────────────────────────────┤
│                                 │
│  Wager *                        │
│  ┌─────────────────────────────┐│
│  │ 🔍 Search wagers...         ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Selvaraj                    ││
│  │ [Type 1] Own Loom · Per kg  ││
│  │ Rate: ₹45.00/kg            ││
│  └─────────────────────────────┘│
│                                 │
│  Loom *                         │
│  ┌─────────────────────────────┐│
│  │ L-003 (Double Lengthy)      ││
│  └─────────────────────────────┘│
│                                 │
│  ──── Return Details ────       │
│                                 │
│  Weight (kg) *         ← LARGE  │
│  ┌─────────────────────────────┐│
│  │              67.5           ││ ← 24sp, centered
│  └─────────────────────────────┘│
│                                 │
│  Piece Count (optional)         │
│  ┌─────────────────────────────┐│
│  │              45             ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ Estimated Wage: ₹ 3,037.50 ││ ← Live calc, green bg
│  │ 67.5 kg × ₹45.00/kg        ││
│  └─────────────────────────────┘│
│                                 │
│  ▼ More Options                 │
│    Godown, Color, Wastage,      │
│    Batch, Shift, Date, Notes    │
│                                 │
│  ┌─────────────────────────────┐│
│  │                             ││
│  │         SAVE (48dp+)        ││ ← Sticky bottom
│  │                             ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Key interactions**:
- Selecting wager changes form layout (weight vs count primary field)
- Estimated wage updates live as user types
- "More Options" collapsed by default — minimal initial fields
- Sticky save button always visible above keyboard

### 8.5 Wage Cycle Detail (Most Complex Screen)

**Layout**:
```
┌─────────────────────────────────┐
│  ← Wage Cycle #WC-2026-08      │
├─────────────────────────────────┤
│                                 │
│  Feb 10 - Feb 16, 2026         │
│  [Review] ← status badge       │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Total Payable               ││
│  │ ₹ 1,85,430                  ││ ← Display size
│  │ 18 workers                  ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │  APPROVE WAGES              ││ ← Large action button
│  │  (Review → Approved)        ││
│  └─────────────────────────────┘│
│                                 │
│  Worker Wages                   │
│  ┌─────────────────────────────┐│
│  │ Selvaraj           [Wager] ││
│  │ Gross: ₹12,450             ││
│  │ Advance: -₹2,000           ││ ← Red
│  │ Damage: -₹450              ││ ← Red
│  │ ─────────────────────────  ││
│  │ Net: ₹9,950                ││ ← Bold, green
│  │                        [▼] ││ ← Expand for detail
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Lakshmi            [Tailor]││
│  │ Gross: ₹3,200              ││
│  │ Net: ₹3,200                ││
│  │                        [▼] ││
│  └─────────────────────────────┘│
│  ... (scrollable list)          │
│                                 │
└─────────────────────────────────┘
```

---

## 9. Component Library

### 9.1 Core Components to Design

| Category | Component | Variants | Priority |
|----------|-----------|----------|----------|
| **Navigation** | Bottom Tab Bar | 4-tab (worker), 5-tab (owner/staff) | P0 |
| | Header Bar | Root (tenant name), Stack (back + title) | P0 |
| | Stack Screen | Standard push transition | P0 |
| **Data Display** | Dashboard Card | Number card, chart card, action card, alert card | P0 |
| | Status Badge | Active, Pending, Approved, Rejected, Overdue, Idle + inventory stages | P0 |
| | Data List Item | Single-line, two-line, three-line, expandable | P0 |
| | Currency Display | Large (display), inline, negative (red) | P0 |
| | Weight Display | kg, g with appropriate precision | P0 |
| | Empty State | Illustration + text + CTA | P1 |
| | Skeleton Loader | Card, list item, detail screen | P1 |
| **Input** | Text Input | Standard, phone, currency, number, textarea | P0 |
| | Searchable Dropdown | Single select with search | P0 |
| | Dropdown Select | Standard, with description | P0 |
| | Date Picker | Single date, date range | P0 |
| | Time Picker | HH:MM | P1 |
| | Radio Group | Horizontal chips, vertical list, with descriptions | P0 |
| | Toggle Switch | On/Off | P0 |
| | Numeric Stepper | Increment/decrement for counts | P1 |
| **Action** | Primary Button | Full-width, large (48dp+), with loading state | P0 |
| | Secondary Button | Outlined, text | P0 |
| | FAB | Standard (56dp), Extended (with label) | P0 |
| | Quick Action Card | Icon + label, tappable | P0 |
| | Swipe Action | Left (reject/red), Right (approve/green) | P1 |
| **Feedback** | Toast/Snackbar | Success, error, info | P0 |
| | Confirmation Dialog | Standard, destructive (red confirm) | P0 |
| | Loading Spinner | Full-screen, inline, button | P0 |
| | Pull-to-Refresh | Standard platform behavior | P0 |
| | Offline Banner | Persistent top banner | P0 |
| | Sync Status Indicator | Synced, pending, failed | P1 |
| **Layout** | Section Header | With optional "See All" link | P0 |
| | Collapsible Section | "More Options" pattern | P0 |
| | Filter Bar | Chips row, scrollable | P0 |
| | Filter Bottom Sheet | Full filter panel | P1 |
| | Pagination | "Load more" button + infinite scroll | P0 |
| **Charts** | Bar Chart | Horizontal/vertical, single color | P2 |
| | Line Chart | Time series, single/multi line | P2 |
| | Pie/Donut Chart | Category breakdown | P2 |
| | Progress Bar | Linear, with percentage | P1 |

### 9.2 Component Design Tokens

Every component should reference the design system tokens:

```
Component Props → Design Tokens:
  color     → colorScheme (primary, secondary, success, error, etc.)
  size      → sizing scale (sm, md, lg)
  spacing   → spacing scale (4, 8, 12, 16, 24, 32dp)
  radius    → borderRadius (sm=8, md=12, lg=16, full=999)
  elevation → shadow (0, 1, 2, 3, 4)
  font      → typography scale (display, h1, h2, bodyLg, body, bodySm, caption)
```

---

## 10. Accessibility & Inclusive Design

### 10.1 Minimum Standards

| Requirement | Target | Notes |
|-------------|--------|-------|
| Touch targets | 48dp minimum | All interactive elements |
| Color contrast | WCAG AA (4.5:1 body, 3:1 large) | Test all status colors against backgrounds |
| Font size | 16sp minimum body text | Never smaller for primary content |
| Screen reader | Full VoiceOver/TalkBack support | All images have alt text, all buttons have labels |
| Dynamic Type | Support system font scaling | Test at 200% scale |
| Reduced Motion | Respect `prefers-reduced-motion` | Skip animations when enabled |

### 10.2 Age-Specific Accommodations

| Challenge | Design Response |
|-----------|----------------|
| Declining near vision | Large fonts, high contrast, no thin/light font weights |
| Reduced motor precision | Large tap targets, generous spacing between interactive elements |
| Unfamiliarity with gestures | Always provide button alternatives to swipe/long-press |
| Cognitive load | One task per screen, clear navigation breadcrumbs |
| Fear of mistakes | Prominent undo, confirmation dialogs, no permanent actions without review |
| Regional language preference | Tamil as first-class, not afterthought. Layout tested in Tamil first. |

### 10.3 Low-End Device Optimization

Many workers use budget Android phones (1-2GB RAM, small screens):

| Constraint | Design Response |
|-----------|----------------|
| Small screen (5"-5.5") | Single column layouts, no side-by-side cards on small screens |
| Low RAM | Minimal images, lazy load lists, limit in-memory data |
| Slow network | Optimistic UI, offline queue, compressed API responses |
| Low storage | No heavy assets, SVG icons, system fonts only |

---

## 11. Localization (i18n) Design

### 11.1 Language Support

| Language | Code | Script | Direction | Text Expansion |
|----------|------|--------|-----------|----------------|
| English | `en` | Latin | LTR | Baseline |
| Tamil | `ta` | Tamil | LTR | +30-50% longer |

### 11.2 Design Rules for Bilingual UI

1. **Button widths**: Always flexible width (never fixed). Tamil text is significantly longer.
   - English: "Save" → Tamil: "சேமிக்கவும்" (~3x longer)
   - English: "Record Production" → Tamil: "உற்பத்தி பதிவு செய்" (~1.5x longer)

2. **Label truncation**: Never truncate labels. Use wrapping or smaller font if needed.

3. **Number formatting**: Indian numbering system in both languages.
   - ₹1,23,456.78 (not ₹123,456.78)
   - Comma grouping: ##,##,###

4. **Date formatting**: DD/MM/YYYY (Indian standard)
   - English: 19/02/2026
   - Tamil: 19/02/2026 (same format, different month names in long form)

5. **Phone formatting**: +91 XXXXX XXXXX

6. **Language toggle**: Always accessible (login screen, header bar, profile settings). Switching is instant — no app restart.

7. **Tamil typography considerations**:
   - Tamil glyphs are taller and wider than Latin characters
   - Use 15% more line height for Tamil
   - Test ALL screens in Tamil before sign-off
   - Some Tamil words are very long (compound words) — ensure wrapping works

### 11.3 Translation Key Categories

```
common.*          → Save, Cancel, Delete, Edit, Back, Search, Filter, etc.
auth.*            → Login, OTP, PIN screens
dashboard.*       → Dashboard card titles, quick action labels
production.*      → All production-related labels
inventory.*       → Stock stages, godown labels
wages.*           → Wage cycle, advances, deductions
sales.*           → Invoice, payment, customer labels
damage.*          → Grade names, approval labels
reports.*         → Report titles, column headers
notifications.*   → Notification templates
errors.*          → Error messages
```

---

## 12. Offline Experience Design

### 12.1 Offline-Capable Operations

These operations work offline and queue for sync:

| Operation | Sync Priority | Conflict Strategy |
|-----------|---------------|-------------------|
| Production return (create) | High | Server wins, notify user |
| Cone issuance (create) | High | Server wins (check stock on sync) |
| Damage record (create) | Medium | Server wins |
| Tailoring record (create) | Medium | Server wins |
| Packaging record (create) | Medium | Server wins |
| Loom downtime start/end | Medium | Server wins |
| Paavu production (create) | Medium | Server wins |

### 12.2 Offline UI Patterns

**Global Offline Banner**:
```
┌─────────────────────────────────┐
│ ⚠ You are offline. Changes     │  ← Amber background
│   will sync when connected.     │
│   [3 pending]                   │
└─────────────────────────────────┘
```

**Per-Item Sync Status**:
```
✓ Synced              → Gray check icon
⟳ Pending sync (2)    → Amber clock icon with count
✗ Sync failed         → Red icon with "Retry" button
```

**Offline Form Behavior**:
- Form submits immediately to local storage
- Success toast: "Saved locally. Will sync when online."
- Item appears in list with "Pending sync" badge
- Pull-to-refresh attempts sync

**Online-Only Screens**:
- Invoices, payments, wage cycles, reports, master data CRUD
- Show: "This feature requires an internet connection" with retry button
- Cache last-seen data for read-only viewing

---

## 13. Motion & Feedback Design

### 13.1 Animation Principles

| Principle | Implementation |
|-----------|---------------|
| Purposeful | Only animate to convey meaning (state change, navigation) |
| Quick | 200-300ms standard, never exceed 500ms |
| Natural | Ease-out for enters, ease-in for exits |
| Reducible | Honor `prefers-reduced-motion` system setting |

### 13.2 Standard Animations

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Screen push | Slide from right (iOS) / Fade + slide up (Android) | 300ms |
| Modal open | Slide up from bottom | 300ms |
| Modal close | Slide down | 250ms |
| Toast appear | Fade in + slide up | 200ms |
| Toast dismiss | Fade out | 150ms |
| Status badge change | Color cross-fade | 200ms |
| Number change (dashboard) | Count-up animation | 400ms |
| Card tap | Scale down to 0.98 → release | 100ms |
| Pull-to-refresh | Spring bounce | Platform native |
| Skeleton shimmer | Linear gradient sweep | Continuous (1.5s loop) |

### 13.3 Haptic Feedback (iOS + Android)

| Action | Haptic | Platform |
|--------|--------|----------|
| Successful action (save, approve) | Light impact | Both |
| Status transition (wage approve) | Medium impact | Both |
| Destructive action confirm (reject) | Warning notification | Both |
| Error (validation fail) | Error notification | Both |
| Pull-to-refresh trigger | Light impact | Both |

---

## 14. Design Deliverables & Phased Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Deliverables**:
- [ ] Design system file (Figma/Sketch)
  - Color palette (light + dark mode)
  - Typography scale (English + Tamil)
  - Spacing & layout grid
  - Elevation & shadow tokens
  - Icon set selection (24dp + 20dp sizes)
- [ ] Component library (base components)
  - Buttons (primary, secondary, text, FAB)
  - Text inputs (standard, phone, currency, number)
  - Dropdowns (standard, searchable)
  - Status badges (all states)
  - Cards (dashboard, list item, expandable)
  - Dialog (confirmation, destructive)
  - Toast/snackbar
  - Navigation (tab bar, header bar)
  - Empty states
  - Skeleton loaders

### Phase 2: Authentication & Dashboards (Weeks 3-4)

**Deliverables**:
- [ ] Login screen (OTP flow + PIN flow + language toggle)
- [ ] PIN setup screen
- [ ] Owner dashboard (all 6 cards + quick actions)
- [ ] Staff dashboard (permission-filtered)
- [ ] Wager dashboard (Tamil-first design)
- [ ] Tailor dashboard
- [ ] Packager dashboard
- [ ] Notification screen
- [ ] Profile screen

### Phase 3: Core Production Flows (Weeks 5-7)

**Deliverables**:
- [ ] Production returns (list + create form with wager-type adaptation)
- [ ] Cone issuances (list + create form with stock availability)
- [ ] Paavu production (list + create form with wastage flagging)
- [ ] Loom downtimes (list + create + end downtime)
- [ ] Damage records (list + create + approval flow)
- [ ] Stock overview (summary cards + detailed table + filters)
- [ ] Cone purchases (list + create with auto-calculations)

### Phase 4: Wages & Finance (Weeks 8-10)

**Deliverables**:
- [ ] Wage cycle list + generate form
- [ ] Wage cycle detail (expandable worker rows, status transitions, discretionary)
- [ ] Advances (list + create with balance display)
- [ ] Invoices (list + create with line items + GST)
- [ ] Invoice detail (status-dependent actions)
- [ ] Payments (list + create with bill-to-bill validation)
- [ ] Customer statement (ledger + aging)
- [ ] Worker self-service: My Wages, My Advances, My Damages

### Phase 5: Master Data & Post-Production (Weeks 11-12)

**Deliverables**:
- [ ] Loom types (list + CRUD)
- [ ] Looms (list + CRUD + wager assignment)
- [ ] Products (list + complex multi-section create/edit form)
- [ ] Suppliers, customers, godowns (list + CRUD each)
- [ ] Wager profiles (list + detail with tabs)
- [ ] Users & permissions (list + CRUD + permission toggles)
- [ ] Tailoring records (list + create)
- [ ] Packaging records (list + create)

### Phase 6: Reports, Settings & Polish (Weeks 13-15)

**Deliverables**:
- [ ] All report screens (use shared report template component)
- [ ] Tenant settings (multi-section form)
- [ ] Batches (list + detail) — feature-flagged
- [ ] Shifts (list + CRUD) — feature-flagged
- [ ] Transfers (list + create) — feature-flagged
- [ ] Wager ranking — feature-flagged
- [ ] Fraud alerts (list + detail + resolve)
- [ ] Offline experience design (banners, sync indicators, queue UI)
- [ ] Error states (403, 404, 500 screens)
- [ ] Onboarding / first-use hints (optional)

### Phase 7: Handoff & QA (Week 16)

**Deliverables**:
- [ ] Complete Figma prototype with all flows connected
- [ ] Design-to-dev handoff documentation
  - Spacing specs, component API mapping
  - Animation specs
  - Accessibility checklist per screen
- [ ] Tamil language QA pass (all screens)
- [ ] Device-size QA (small phone 5", standard 6.1", large 6.7")
- [ ] Dark mode pass (all screens)
- [ ] Final design review with stakeholders

---

## 15. Design Tool Recommendations

### Primary Design Tool

**Figma** (recommended) — cross-platform, real-time collaboration, robust component system, free tier available.

### Figma File Structure

```
Powerloom ERP Mobile/
├── 🎨 Design System
│   ├── Colors (light + dark)
│   ├── Typography (English + Tamil)
│   ├── Spacing & Grid
│   ├── Elevation
│   └── Icons
├── 📦 Component Library
│   ├── Atoms (buttons, inputs, badges, icons)
│   ├── Molecules (cards, list items, form groups)
│   ├── Organisms (headers, tab bars, filter panels)
│   └── Templates (list screen, detail screen, form screen, dashboard)
├── 📱 Screens — Authentication
├── 📱 Screens — Owner/Staff
│   ├── Dashboard
│   ├── Production
│   ├── Inventory
│   ├── Sales
│   ├── Wages
│   ├── Quality
│   ├── Post-Production
│   ├── Master Data
│   ├── Reports
│   ├── Settings
│   └── Notifications & Alerts
├── 📱 Screens — Worker Self-Service
│   ├── Wager
│   ├── Tailor
│   └── Packager
├── 🔄 User Flows (connected prototypes)
└── 📝 Handoff Notes
```

### Supporting Tools

| Tool | Purpose |
|------|---------|
| **Figma** | UI design, prototyping, component library, handoff |
| **FigJam** | User flow mapping, whiteboarding |
| **Stark (Figma plugin)** | Accessibility contrast checking |
| **Translate (Figma plugin)** | Tamil translation preview |
| **Figma Tokens** | Design token management and export |

### Design-to-Code Bridge

Since the app uses **React Native**, the design system should export tokens compatible with:

```typescript
// Example: design tokens → React Native StyleSheet
export const colors = {
  primary: '#1B5E20',
  primaryLight: '#4C8C4A',
  // ...
};

export const typography = {
  display: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h1: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  // ...
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
};
```

---

## Appendix A: Screen Count Summary

| Category | Screen Count | Unique Templates |
|----------|-------------|-----------------|
| Authentication | 2 | 2 |
| Dashboards | 5 | 3 (owner, staff=variant, 3 worker types) |
| Production | 10 | 5 (list + form pairs) |
| Inventory | 7 | 4 |
| Sales & Finance | 7 | 5 |
| Wages | 6 | 4 |
| Damage Management | 4 | 3 |
| Post-Production | 4 | 2 |
| Master Data | 14 | 5 (most share list+CRUD template) |
| Reports | 17 | 2 (shared report template) |
| Settings & Profile | 2 | 2 |
| Worker Self-Service | 9 | 4 (most share read-only list template) |
| System (errors, offline) | 5 | 5 |
| **Total** | **~82** | **~46** |

## Appendix B: Device Testing Matrix

| Device | OS | Screen | Category | Priority |
|--------|-----|--------|----------|----------|
| Samsung Galaxy A14 | Android 13 | 6.6" 720p | Budget Android (worker) | P0 |
| Realme C30 | Android 12 Go | 6.5" 720p | Ultra-budget (worker) | P0 |
| Samsung Galaxy A54 | Android 14 | 6.4" 1080p | Mid-range (owner) | P0 |
| Redmi Note 12 | Android 13 | 6.67" 1080p | Mid-range (staff) | P0 |
| iPhone SE (3rd gen) | iOS 17 | 4.7" | Small iPhone | P1 |
| iPhone 13 | iOS 17 | 6.1" | Standard iPhone (owner) | P0 |
| iPhone 15 Pro Max | iOS 17 | 6.7" | Large iPhone | P1 |

## Appendix C: Feature Flag Impact on Design

| Flag | When OFF → Hide | Screens Affected |
|------|----------------|-----------------|
| `batchEnabled` | Batch dropdown in all forms, Batches menu, Batch profitability report | ~15 screens |
| `shiftEnabled` | Shift dropdown in production return, Shifts menu, Shift production report, Shift wage rates in product | ~8 screens |
| `interGodownTransferEnabled` | Transfers menu, Transfer button in inventory | 3 screens |
| `showWagerRanking` | Ranking in wager dashboard, Ranking screen | 2 screens (worker-facing) |

**Design approach**: Design all screens with feature-flagged elements visible, then create a variant layer showing the "off" state for each flag.

---

*This plan covers the complete UI/UX design scope for the Powerloom ERP mobile application across iOS and Android platforms. It should be used alongside `docs/ui-functionality-spec.md` for detailed screen requirements and `docs/powerloom-erp-v3.md` for business logic reference.*
