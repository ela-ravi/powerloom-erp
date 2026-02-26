-- Phase 2: Master Data Seeds
-- Uses tenants from 001_tenants.sql

-- Get tenant IDs (use these in subqueries below)
-- Tenant 1: Ravi Textiles (TN) -- id from seeds/001_tenants.sql
-- Tenant 2: Kumar Textiles (KA)

-- ============================================================
-- Loom Types
-- ============================================================
INSERT INTO loom_types (tenant_id, name, nickname, capacity_pieces_per_day) VALUES
  ((SELECT id FROM tenants WHERE name = 'Ravi Textiles'), 'Single Lengthy', 'Single', 15),
  ((SELECT id FROM tenants WHERE name = 'Ravi Textiles'), 'Double Lengthy', 'Box', 8),
  ((SELECT id FROM tenants WHERE name = 'Ravi Textiles'), 'Air Loom', 'Air', 20),
  ((SELECT id FROM tenants WHERE name = 'Kumar Textiles'), 'Single Lengthy', 'Single', 12),
  ((SELECT id FROM tenants WHERE name = 'Kumar Textiles'), 'Double Lengthy', 'Double', 6);

-- ============================================================
-- Looms (assigned to wager users from 002_users.sql)
-- ============================================================
INSERT INTO looms (tenant_id, loom_type_id, loom_number, ownership, maintenance_status, assigned_wager_id) VALUES
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    (SELECT id FROM loom_types WHERE name = 'Single Lengthy' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles')),
    'L-001', 'owner', 'operational',
    (SELECT id FROM users WHERE name = 'Muthu Wager T1' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles'))
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    (SELECT id FROM loom_types WHERE name = 'Single Lengthy' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles')),
    'L-002', 'owner', 'operational',
    (SELECT id FROM users WHERE name = 'Vel Wager T2' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles'))
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    (SELECT id FROM loom_types WHERE name = 'Double Lengthy' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles')),
    'L-003', 'wager', 'operational',
    (SELECT id FROM users WHERE name = 'Kannan Wager T3' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles'))
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    (SELECT id FROM loom_types WHERE name = 'Air Loom' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles')),
    'L-004', 'wager', 'idle', NULL
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    (SELECT id FROM loom_types WHERE name = 'Single Lengthy' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles')),
    'L-005', 'owner', 'under_maintenance',
    (SELECT id FROM users WHERE name = 'Raj Wager T4' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles'))
  );

-- ============================================================
-- Products
-- ============================================================
INSERT INTO products (
  tenant_id, name, size, category,
  paavu_to_piece_ratio, paavu_consumption_grams, paavu_wastage_grams, paavu_wastage_pct,
  oodai_consumption_grams, oodai_wastage_grams, oodai_wastage_pct,
  wage_rate_per_kg, wage_rate_per_piece,
  stitch_rate_per_piece, knot_rate_per_piece,
  small_bundle_count, large_bundle_count, bundle_rate_small, bundle_rate_large,
  gst_rate_pct, color_pricing_mode, hsn_code
) VALUES
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'Khadi', '30x60', 'single',
    1.0000, 150.00, 5.00, 3.33,
    200.00, 8.00, 4.00,
    25.00, 3.50,
    1.00, 0.50,
    10, 50, 5.00, 20.00,
    5.00, 'per_color', '5208'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'Jakkadu', '40x80', 'double',
    0.5000, 300.00, 10.00, 3.33,
    400.00, 15.00, 3.75,
    30.00, 7.00,
    1.50, 0.75,
    10, 50, 8.00, 35.00,
    5.00, 'average', '5208'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'Cotton Towel', '27x54', 'single',
    1.0000, 120.00, 4.00, 3.33,
    180.00, 6.00, 3.33,
    22.00, 3.00,
    0.80, 0.40,
    12, 60, 4.00, 18.00,
    5.00, 'average', '5208'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Kumar Textiles'),
    'Khadi', '30x60', 'single',
    1.0000, 140.00, 4.50, 3.21,
    190.00, 7.00, 3.68,
    24.00, 3.25,
    0.90, 0.45,
    10, 50, 4.50, 18.00,
    5.00, 'average', '5208'
  );

-- ============================================================
-- Product Color Prices (for per_color mode products)
-- ============================================================
INSERT INTO product_color_prices (tenant_id, product_id, color, selling_price_per_piece) VALUES
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    (SELECT id FROM products WHERE name = 'Khadi' AND size = '30x60' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles')),
    'White', 45.00
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    (SELECT id FROM products WHERE name = 'Khadi' AND size = '30x60' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles')),
    'Red', 48.00
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    (SELECT id FROM products WHERE name = 'Khadi' AND size = '30x60' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles')),
    'Blue', 47.00
  );

-- ============================================================
-- Suppliers
-- ============================================================
INSERT INTO suppliers (tenant_id, name, phone, address, gstin) VALUES
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'Lakshmi Cotton Mills', '+919876000001', '123 Mill Road, Erode, Tamil Nadu', '33AAACL1234A1Z5'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'Murugan Thread Works', '+919876000002', '456 Industrial Area, Tirupur, Tamil Nadu', '33AAACM5678B1Z5'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Kumar Textiles'),
    'Coimbatore Cotton Co', '+919876000003', '789 Textile Park, Coimbatore, Tamil Nadu', '33AAACC9012C1Z5'
  );

-- ============================================================
-- Customers (all 3 types)
-- ============================================================
INSERT INTO customers (tenant_id, name, phone, address, state_code, gstin, customer_type, credit_period_days) VALUES
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'Chennai Wholesale Hub', '+919876100001', '100 Mint St, Chennai', 'TN', '33BBBCH1234D1Z5',
    'wholesale_partial', 45
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'Madurai Textiles', '+919876100002', '200 South Masi St, Madurai', 'TN', '33BBBMT5678E1Z5',
    'wholesale_bill_to_bill', 30
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'Bangalore Retail Shop', '+919876100003', '300 Commercial St, Bangalore', 'KA', '29BBBRS9012F1Z5',
    'retail', 0
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Kumar Textiles'),
    'Mysore Traders', '+919876100004', '400 Market Road, Mysore', 'KA', '29BBBMT3456G1Z5',
    'wholesale_partial', 30
  );

-- ============================================================
-- Godowns (main + secondary + paavu pattarai)
-- ============================================================
INSERT INTO godowns (tenant_id, name, address, is_main, godown_type) VALUES
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'Main Godown', '10 Factory Road, Salem', true, 'godown'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'Secondary Godown', '20 Warehouse Lane, Salem', false, 'godown'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'Paavu Pattarai', '30 Industrial Area, Salem', false, 'paavu_pattarai'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Kumar Textiles'),
    'Main Warehouse', '50 Textile Hub, Bangalore', true, 'godown'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Kumar Textiles'),
    'Paavu Unit', '60 Factory Zone, Bangalore', false, 'paavu_pattarai'
  );

-- ============================================================
-- Wager Profiles (already auto-created in 002_users.sql for wager users)
-- Update wager types to match the 4 types
-- ============================================================
-- Muthu Wager T1 = Type 1 (own loom, paavu+oodai, weight, per kg)
UPDATE wager_profiles SET wager_type = 1, original_advance = 5000, advance_balance = 5000
WHERE user_id = (SELECT id FROM users WHERE name = 'Muthu Wager T1' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles'));

-- Vel Wager T2 = Type 2 (own loom, oodai only, count, per piece)
UPDATE wager_profiles SET wager_type = 2, original_advance = 3000, advance_balance = 3000
WHERE user_id = (SELECT id FROM users WHERE name = 'Vel Wager T2' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles'));

-- Kannan Wager T3 = Type 3 (owner's loom, paavu+oodai, weight, per kg)
UPDATE wager_profiles SET wager_type = 3, original_advance = 8000, advance_balance = 8000
WHERE user_id = (SELECT id FROM users WHERE name = 'Kannan Wager T3' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles'));

-- Raj Wager T4 = Type 4 (owner's loom, oodai only, count, per piece)
UPDATE wager_profiles SET wager_type = 4, original_advance = 2000, advance_balance = 2000
WHERE user_id = (SELECT id FROM users WHERE name = 'Raj Wager T4' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles'));
