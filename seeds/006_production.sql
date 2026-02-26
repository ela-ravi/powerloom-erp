-- Phase 5: Production System seed data
-- Depends on: 001-005 seeds

-- Enable shift tracking for Ravi Textiles
UPDATE tenant_settings
SET shift_enabled = true, show_wager_ranking = true
WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles' LIMIT 1);

-- Create shifts
INSERT INTO shifts (tenant_id, name, start_time, end_time)
SELECT t.id, 'Morning Shift', '06:00', '14:00'
FROM tenants t WHERE t.name = 'Ravi Textiles';

INSERT INTO shifts (tenant_id, name, start_time, end_time)
SELECT t.id, 'Evening Shift', '14:00', '22:00'
FROM tenants t WHERE t.name = 'Ravi Textiles';

INSERT INTO shifts (tenant_id, name, start_time, end_time)
SELECT t.id, 'Night Shift', '22:00', '06:00'
FROM tenants t WHERE t.name = 'Ravi Textiles';

-- Cone issuances (issue cones to wagers from godown)
INSERT INTO cone_issuances (tenant_id, wager_id, godown_id, product_id, color, quantity_kg, issued_by)
SELECT
  t.id, u.id, g.id, p.id, 'White', 50.0,
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.role = 'wager'
JOIN godowns g ON g.tenant_id = t.id AND g.is_main = true
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Paavu productions
INSERT INTO paavu_productions (tenant_id, paavu_oati_id, godown_id, product_id, color, cone_weight_kg, paavu_count, wastage_grams, wastage_flagged, created_by)
SELECT
  t.id, u.id, g.id, p.id, 'White', 30.0, 50, 300, false,
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.role = 'wager'
JOIN godowns g ON g.tenant_id = t.id AND g.godown_type = 'paavu_pattarai'
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Production returns (woven pieces returned by wager)
INSERT INTO production_returns (tenant_id, wager_id, loom_id, godown_id, product_id, color, piece_count, weight_kg, wastage_kg, created_by)
SELECT
  t.id, u.id, l.id, g.id, p.id, 'White', 100, 25.5, 0.5,
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.role = 'wager'
JOIN looms l ON l.tenant_id = t.id
JOIN godowns g ON g.tenant_id = t.id AND g.is_main = true
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Loom downtimes
INSERT INTO loom_downtimes (tenant_id, loom_id, wager_id, reason, start_time, end_time, duration_minutes, reported_by)
SELECT
  t.id, l.id, u.id, 'mechanical',
  '2026-02-15 08:00:00+05:30', '2026-02-15 10:30:00+05:30', 150,
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.role = 'wager'
JOIN looms l ON l.tenant_id = t.id
WHERE t.name = 'Ravi Textiles'
LIMIT 1;
