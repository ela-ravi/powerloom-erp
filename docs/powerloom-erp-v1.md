---
# 🧵 Powerloom Production ERP System

### Multi-Tenant, Batch-Based Textile Manufacturing & Wage Management Platform
---

# Table of Contents

1. [Industry Overview](#industry-overview)
2. [Core Textile Terminology](#core-textile-terminology)
3. [Types of Powerlooms](#types-of-powerlooms)
4. [Types of Products](#types-of-products)
5. [People Involved in the Ecosystem](#people-involved-in-the-ecosystem)
6. [Types of Wagers](#types-of-wagers)
7. [End-to-End Production Flow](#end-to-end-production-flow)
8. [Batch-Based Production System](#batch-based-production-system)
9. [Raw Material Management](#raw-material-management)
10. [Paavu Pattarai (Warp Unit)](#paavu-pattarai-warp-unit)
11. [Wager Production System](#wager-production-system)
12. [Damage Management & Wage Deduction](#damage-management--wage-deduction)
13. [Tailoring Process](#tailoring-process)
14. [Packaging Process](#packaging-process)
15. [Sales, Wholesale & Retail System](#sales-wholesale--retail-system)
16. [Advance Management System](#advance-management-system)
17. [Loss & Fraud Detection Engine](#loss--fraud-detection-engine)
18. [Multi-Godown Management](#multi-godown-management)
19. [Multi-Language Support](#multi-language-support)
20. [Powerloom Capacity Tracking](#powerloom-capacity-tracking)
21. [Reports & Intelligence Dashboard](#reports--intelligence-dashboard)

---

# Industry Overview

This ERP system is designed for **Powerloom Owners / Wholesalers** who:

- Purchase cotton cone threads from mills
- Issue raw materials to wagers
- Manage Paavu production (warp preparation)
- Oversee textile manufacturing
- Handle tailoring and packaging
- Sell finished goods to wholesale customers
- Occasionally sell directly to retailers

The platform is **multi-tenant SaaS**, allowing multiple wholesalers to use it independently.

---

# Core Textile Terminology

## 🧶 Paavu

Long running threads of the woven fabric (Length direction).

## 🧵 Oodai

Cross threads of the woven fabric (Width direction).

Example:
If product size = 30 x 60 inches

- 60 inches → Paavu
- 30 inches → Oodai

---

# Types of Powerlooms

Each loom has different production capacity.

| Type                | Nickname          | Description                    |
| ------------------- | ----------------- | ------------------------------ |
| Single Lengthy Loom | Single            | Produces single-length fabrics |
| Double Lengthy Loom | Box               | Produces double-length fabrics |
| Triple Length Loom  | Air Loom / Rapier | Produces triple-length fabrics |
| Future Types        | —                 | Expandable                     |

Each loom record contains:

- Loom ID
- Loom Type
- Production capacity (pieces/day)
- Assigned wager
- Maintenance history
- Status (Active / Maintenance)

---

# Types of Products

Examples:

- Khadi
- Jakkadu
- Others (Expandable)

Each Product Master includes:

- Product Name
- Size (30x60, 27x54, 40x80, etc.)
- Category (Single / Double / Triple / Quad)
- Paavu cotton consumption per piece
- Paavu wastage (grams or %)
- Oodai cotton consumption per piece
- Oodai wastage (grams or %)
- Wage rate per kg
- Wage rate per piece
- Stitch rate
- Knot rate
- Bundle configuration
- Optional color-wise selling price

---

# People Involved in the Ecosystem

## 1️⃣ Owner / Wholesaler (Person 1)

- Purchases cotton
- Issues materials
- Pays wages
- Approves damage deductions
- Handles customers
- Manages batches & stock

## 2️⃣ Wagers (Powerloom Operators)

Operate looms and produce woven fabrics.

## 3️⃣ Paavu Oati

Prepare Paavu in Paavu Pattarai.

## 4️⃣ Tailors

- Stitch edges
- Knot ends

## 5️⃣ Packagers

Prepare small & large bundles.

## 6️⃣ Transport / Tempo Operators

Deliver goods to customers.

## 7️⃣ Cotton Mills / Suppliers

Supply cone threads.

## 8️⃣ Customers

Two types:

- Wholesale Customers (Primary buyers)
- Retailers (Occasional direct buyers)

---

# Types of Wagers

| Type   | Loom Ownership | Work Performed |
| ------ | -------------- | -------------- |
| Type 1 | Own Loom       | Paavu + Oodai  |
| Type 2 | Own Loom       | Only Oodai     |
| Type 3 | Owner’s Loom   | Paavu + Oodai  |
| Type 4 | Owner’s Loom   | Only Oodai     |

---

# End-to-End Production Flow

Supplier → Cone Purchase → Godown
→ Create Batch
→ Issue to Paavu Pattarai
→ Issue to Wager
→ Production Return
→ Inspection
→ Tailor
→ Packaging
→ Godown
→ Invoice
→ Dispatch
→ Payment Collection

All linked via **Batch ID**.

---

# Batch-Based Production System

Each production cycle must belong to a Batch.

Batch includes:

- Product
- Size
- Color
- Target quantity
- Status
- Tenant ID

Benefits:

- Fraud detection
- Profit per batch
- Wager comparison
- Capacity monitoring

---

# Raw Material Management

Cone Purchase contains:

- Bale ID (Optional — may not always exist)
- Supplier
- Color
- Weight (60kg standard)
- Cost
- GST details

Inventory tracked:

Color-wise + Godown-wise + Batch-wise.

Allowed wastage:

- Type 1 & 3 → 1kg per 60kg
- Type 2 & 4 → 500g per 60kg
- Paavu Pattarai → Configurable constant

---

# Paavu Pattarai (Warp Unit)

- Cone issued batch-wise
- Paavu count produced
- Wastage monitored
- Weekly wage calculated
- Inventory updated

Loss flagged if wastage exceeds limit.

---

# Wager Production System

## Type 1 & 3

- Return by weight (mandatory)
- Count tracking optional
- Wage based on weight

## Type 2 & 4

- Return by count (mandatory)
- Weight tracking optional
- Wage based on count

System validates:

- Expected weight return
- Paavu-to-piece ratio
- Wastage constant
- Damage percentage

---

# Damage Management & Wage Deduction

Damage detected at:

- Inspection
- Tailoring
- Packaging
- Customer return

Process:

1. Damage recorded
2. Owner approval required
3. Damage return note created
4. Deduction applied to wage

Deduction formula:

Damage Count × Production Cost per Piece

Production cost includes:

- Material cost
- Wage cost

No profit included.

---

# Tailoring Process

Tracks:

- Stitch count
- Knot count
- Batch linkage

Mismatch detection enabled.

---

# Packaging Process

Two types:

- Small bundle
- Large bundle

Inventory converted from loose stock to bundled stock.

---

# Sales, Wholesale & Retail System

Customers:

- Wholesale (Primary)
- Retail (Occasional)

Features:

- Sale per piece
- Optional color-wise pricing
- GST invoice generation
- Optional E-way bill export
- 30-day credit tracking
- Overdue alerts

---

# Advance Management System

Wagers may receive advance (e.g., ₹40,000).

Weekly calculation:

Gross Wage
– Advance Deduction
– Damage Deduction
= Net Payable

Remaining advance tracked until settlement.

---

# Loss & Fraud Detection Engine

System flags:

- Color substitution
- Excess wastage
- Low production vs issued cotton
- Damage percentage abnormal
- Loom underperformance
- Stock mismatch
- Customer overdue

---

# Multi-Godown Management

Each tenant can manage:

- Main Godown
- Additional Godowns
- Paavu Pattarai location

Stock tracked per:

Godown + Product + Color + Batch

---

# Multi-Language Support

Initial:

- English
- Tamil

Expandable architecture for:

- Hindi
- Telugu
- Others

---

# Powerloom Capacity Tracking

Each loom stores:

- Maximum capacity (pieces/day)
- Average production
- Assigned wager

System calculates:

Capacity Utilization % =
(Actual Production / Expected Capacity) × 100

Helps identify:

- Underperforming wagers
- Machine inefficiency
- Idle time

---

# Reports & Intelligence Dashboard

- Batch profitability
- Color profitability
- Wager performance
- Damage rate %
- Advance outstanding
- Customer receivable aging
- GST summary
- Loom utilization
- Godown stock
- Weekly wage sheet (Auto Sunday)

---
