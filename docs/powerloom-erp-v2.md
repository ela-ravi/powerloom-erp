---
# 🧵 Powerloom Production ERP System

### Multi-Tenant | Batch-Based | Manufacturing + Wage + GST ERP
---

# Table of Contents

1. [Industry Overview](#industry-overview)
2. [Core Textile Terminology](#core-textile-terminology)
3. [Types of Powerlooms](#types-of-powerlooms)
4. [Product Master Configuration](#product-master-configuration)
5. [People Involved in the Ecosystem](#people-involved-in-the-ecosystem)
6. [Types of Wagers](#types-of-wagers)
7. [Batch-Based Production System](#batch-based-production-system)
8. [Raw Material & Inventory Management](#raw-material--inventory-management)
9. [Paavu Pattarai (Warp Unit)](#paavu-pattarai-warp-unit)
10. [Wager Production System](#wager-production-system)
11. [Damage Management & Owner Approval Flow](#damage-management--owner-approval-flow)
12. [Tailoring Process](#tailoring-process)
13. [Packaging Process](#packaging-process)
14. [Sales (Wholesale & Retail) + GST](#sales-wholesale--retail--gst)
15. [Advance & Wage Management System](#advance--wage-management-system)
16. [Loom Capacity & Performance Intelligence](#loom-capacity--performance-intelligence)
17. [Loss & Fraud Detection Engine](#loss--fraud-detection-engine)
18. [Multi-Godown Management](#multi-godown-management)
19. [Multi-Language Architecture](#multi-language-architecture)
20. [Reports & Analytics Dashboard](#reports--analytics-dashboard)

---

# Industry Overview

This ERP system is designed for:

- Powerloom Owners / Wholesalers
- Textile micro-manufacturing clusters
- Batch-based textile manufacturing

It supports:

- Multi-tenant SaaS architecture
- Mobile-first usage
- Batch-level traceability
- Wage automation
- Damage recovery
- GST invoice system
- Optional E-way bill support

Customers may include:

- Wholesale buyers (primary)
- Retail buyers (occasional direct sales)

---

# Core Textile Terminology

## 🧶 Paavu

Long running threads of the woven fabric (length direction).

## 🧵 Oodai

Cross threads of the woven fabric (width direction).

Example:
Product size = 30 x 60 inches

- 60 inches → Paavu
- 30 inches → Oodai

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

---

# Product Master Configuration

Each product includes:

- Product Name (Khadi, Jakkadu, etc.)
- Size (30x60, 27x54, 40x80, etc.)
- Category (Single / Double / Triple / Quad)
- Paavu consumption per piece (grams)
- Paavu wastage (grams or %)
- Oodai consumption per piece (grams)
- Oodai wastage (grams or %)
- Wage rate per kg
- Wage rate per piece
- Stitch rate
- Knot rate
- Bundle configuration (small & large)
- Optional color-wise selling price

Color Pricing Modes:

- Mode 1: Average price for multi-color bundles
- Mode 2 (Optional): Different selling price per color

---

# People Involved in the Ecosystem

## 1️⃣ Owner / Wholesaler (Person 1)

- Purchases cones
- Creates batches
- Approves damage deductions
- Pays wages
- Manages customers
- Controls performance visibility

## 2️⃣ Wagers

Operate powerlooms and produce woven fabrics.

## 3️⃣ Paavu Oati

Prepare warp (Paavu) in Paavu Pattarai.

## 4️⃣ Tailors

Stitch & knot woven fabrics.

## 5️⃣ Packagers

Bundle finished products.

## 6️⃣ Transport Operators

Deliver goods.

## 7️⃣ Suppliers (Cotton Mills)

## 8️⃣ Customers

- Wholesale buyers
- Retail buyers

---

# Types of Wagers

| Type   | Loom Ownership | Work Done     |
| ------ | -------------- | ------------- |
| Type 1 | Own Loom       | Paavu + Oodai |
| Type 2 | Own Loom       | Oodai only    |
| Type 3 | Owner’s Loom   | Paavu + Oodai |
| Type 4 | Owner’s Loom   | Oodai only    |

Return Logic:

- Type 1 & 3 → Weight mandatory, count optional
- Type 2 & 4 → Count mandatory, weight optional

---

# Batch-Based Production System

Every production cycle belongs to a Batch.

Batch includes:

- Product
- Color
- Size
- Target quantity
- Status (Open / Closed)
- Tenant ID

All operations link to Batch ID.

---

# Raw Material & Inventory Management

Cone purchase includes:

- Bale ID (Optional)
- Supplier
- Color
- Weight
- Cost
- GST details

Wastage rules:

- Type 1 & 3 → 1kg per 60kg
- Type 2 & 4 → 500g per 60kg
- Paavu Pattarai → Configurable

Inventory tracked by:

Godown + Product + Color + Batch

---

# Paavu Pattarai

- Cone issued batch-wise
- Paavu count produced
- Wastage applied
- Weekly wage calculated

Loss flagged if wastage exceeds allowed limit.

---

# Wager Production System

Validation includes:

- Expected weight return
- Expected piece count from Paavu
- Wastage check
- Damage percentage

All linked to Batch.

---

# Damage Management & Owner Approval Flow

Damage may occur during:

- Inspection
- Tailoring
- Packaging
- Customer return

Process:

1. Damage recorded
2. Owner approval required
3. Damage return note generated
4. Deduction applied

Deduction Formula:

Damage Count × Production Cost per Piece

Production cost includes:

- Material cost
- Wage cost
  (No profit included)

---

# Tailoring Process

Tracks:

- Stitch count
- Knot count
- Batch linkage

Mismatch detection enabled.

---

# Packaging Process

Two bundle types:

- Small bundle
- Large bundle

Stock converted from loose to bundled.

---

# Sales (Wholesale & Retail) + GST

Features:

- Sale per piece
- Multi-color bundle pricing
- GST invoice generation
- Optional E-way bill JSON export
- 30-day credit tracking
- Overdue alerts

---

# Advance & Wage Management System

Wagers may receive advance (e.g., ₹40,000).

Weekly calculation:

Gross Wage
– Advance Deduction
– Damage Deduction
= Net Payable

Remaining advance tracked.

---

# Loom Capacity & Performance Intelligence

Capacity defined per loom type.

## Expected Production Calculation

Expected Production =
(Loom Type Capacity × Working Days)

If downtime recorded:

Expected Production reduces automatically.

Downtime may include:

- Maintenance days
- Electricity failure
- Leave days

---

## Shift-Based Production (Optional)

System setting:

Enable Shift Tracking? (Yes / No)

If Yes:

- Morning shift
- Evening shift
- Night shift

Production tracked shift-wise.

---

## Wager Performance Ranking

System calculates:

Capacity Utilization % =
(Actual Production / Adjusted Expected Production) × 100

Ranking generated based on utilization.

Visibility Control:

Admin / Owner can:

- Show ranking to wagers
- Hide ranking from wagers

---

# Loss & Fraud Detection Engine

Detects:

- Color substitution
- Excess wastage
- Underproduction
- High damage %
- Loom inefficiency
- Inventory mismatch
- Customer overdue

---

# Multi-Godown Management

Each tenant can manage:

- Main godown
- Additional godowns
- Paavu Pattarai location

Stock tracked per:

Godown + Product + Color + Batch

---

# Multi-Language Architecture

Initial:

- English
- Tamil

Expandable via translation key system.

---

# Reports & Analytics Dashboard

Production Reports:

- Batch profitability
- Color profitability
- Product profitability

Wager Reports:

- Weekly wage sheet
- Damage %
- Capacity utilization
- Advance balance

Inventory Reports:

- Cone stock
- Paavu stock
- Finished stock
- Bundle stock

Finance Reports:

- GST summary
- Customer receivables
- Supplier ledger

Performance Reports:

- Loom utilization
- Wager ranking
- Downtime report

---

# ✅ System Completeness Status

Your ERP now includes:

✔ Batch-based manufacturing
✔ 4 wager types
✔ Damage recovery with owner approval
✔ Advance deduction system
✔ Capacity-based performance tracking
✔ Downtime-adjusted expectations
✔ Shift tracking (optional)
✔ Retail + Wholesale support
✔ GST invoice
✔ Optional E-way bill
✔ Multi-godown
✔ Multi-language
✔ Fraud detection engine

---
