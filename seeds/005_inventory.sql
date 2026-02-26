-- Phase 4: Inventory & Raw Materials seed data
-- Depends on: 001_tenants.sql, 002_users.sql, 003_master_data.sql

-- Note: This seed uses the tenant, supplier, godown, product IDs from prior seeds.
-- UUIDs must match those inserted in seeds 001-003.

-- Enable inter-godown transfers for Ravi Textiles
-- (batch_enabled was already set in 004_batches.sql)
UPDATE tenant_settings
SET inter_godown_transfer_enabled = true
WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles' LIMIT 1);

-- Cone Purchases (raw material procurement)
-- Purchase 1: White cotton cones from supplier to main godown
INSERT INTO cone_purchases (
  tenant_id, supplier_id, godown_id, product_id, color,
  quantity_kg, rate_per_kg, total_cost, gst_rate_pct, gst_amount,
  invoice_number, purchase_date, notes, created_by
)
SELECT
  t.id, s.id, g.id, p.id, 'White',
  120.00, 250.00, 30000.00, 5.00, 1500.00,
  'INV-2024-001', '2024-06-01', 'First bulk purchase', u.id
FROM tenants t
JOIN suppliers s ON s.tenant_id = t.id AND s.name = 'Lakshmi Cotton Suppliers'
JOIN godowns g ON g.tenant_id = t.id AND g.is_main = true
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Purchase 2: Red cotton cones
INSERT INTO cone_purchases (
  tenant_id, supplier_id, godown_id, product_id, color,
  quantity_kg, rate_per_kg, total_cost, gst_rate_pct, gst_amount,
  invoice_number, purchase_date, notes, created_by
)
SELECT
  t.id, s.id, g.id, p.id, 'Red',
  80.00, 280.00, 22400.00, 5.00, 1120.00,
  'INV-2024-002', '2024-06-05', 'Red cotton for festive season', u.id
FROM tenants t
JOIN suppliers s ON s.tenant_id = t.id AND s.name = 'Lakshmi Cotton Suppliers'
JOIN godowns g ON g.tenant_id = t.id AND g.is_main = true
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Inventory records (raw cone stage)
INSERT INTO inventory (tenant_id, godown_id, product_id, color, stage, quantity, weight_kg)
SELECT
  t.id, g.id, p.id, 'White', 'raw_cone', 120.00, 120.00
FROM tenants t
JOIN godowns g ON g.tenant_id = t.id AND g.is_main = true
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

INSERT INTO inventory (tenant_id, godown_id, product_id, color, stage, quantity, weight_kg)
SELECT
  t.id, g.id, p.id, 'Red', 'raw_cone', 80.00, 80.00
FROM tenants t
JOIN godowns g ON g.tenant_id = t.id AND g.is_main = true
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Some woven inventory (already processed stock)
INSERT INTO inventory (tenant_id, godown_id, product_id, color, stage, quantity, weight_kg)
SELECT
  t.id, g.id, p.id, 'White', 'woven', 50.00, 25.00
FROM tenants t
JOIN godowns g ON g.tenant_id = t.id AND g.is_main = true
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Inventory movements for the cone purchases
INSERT INTO inventory_movements (tenant_id, inventory_id, movement_type, quantity_change, weight_change_kg, reference_type, reference_id, created_by)
SELECT
  i.tenant_id, i.id, 'increase', i.quantity, i.weight_kg, 'cone_purchase',
  (SELECT cp.id FROM cone_purchases cp WHERE cp.tenant_id = i.tenant_id AND cp.color = i.color LIMIT 1),
  (SELECT u.id FROM users u WHERE u.tenant_id = i.tenant_id AND u.role = 'owner' LIMIT 1)
FROM inventory i
JOIN tenants t ON t.id = i.tenant_id
WHERE t.name = 'Ravi Textiles' AND i.stage = 'raw_cone';
