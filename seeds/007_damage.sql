-- Phase 6: Damage Management seed data
-- Depends on: 001-006 seeds

-- Minor damage at loom (wager-linked)
INSERT INTO damage_records (tenant_id, production_return_id, wager_id, product_id, detection_point, grade, damage_count, deduction_rate_pct, production_cost_per_piece, total_deduction, approval_status, is_miscellaneous)
SELECT
  t.id,
  pr.id,
  pr.wager_id,
  pr.product_id,
  'loom',
  'minor',
  3,
  ts.damage_minor_deduction_pct,
  40.00,
  3 * 40.00 * ts.damage_minor_deduction_pct / 100,
  'pending',
  false
FROM tenants t
JOIN tenant_settings ts ON ts.tenant_id = t.id
JOIN production_returns pr ON pr.tenant_id = t.id
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Major damage at tailoring (wager-linked, approved)
INSERT INTO damage_records (tenant_id, wager_id, product_id, detection_point, grade, damage_count, deduction_rate_pct, production_cost_per_piece, total_deduction, approval_status, approved_by, approved_at, is_miscellaneous)
SELECT
  t.id,
  u.id,
  p.id,
  'tailoring',
  'major',
  2,
  ts.damage_major_deduction_pct,
  40.00,
  2 * 40.00 * ts.damage_major_deduction_pct / 100,
  'approved',
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1),
  NOW(),
  false
FROM tenants t
JOIN tenant_settings ts ON ts.tenant_id = t.id
JOIN users u ON u.tenant_id = t.id AND u.role = 'wager'
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Reject damage at packaging (wager-linked, rejected)
INSERT INTO damage_records (tenant_id, wager_id, product_id, detection_point, grade, damage_count, deduction_rate_pct, production_cost_per_piece, total_deduction, approval_status, approved_by, approved_at, is_miscellaneous)
SELECT
  t.id,
  u.id,
  p.id,
  'packaging',
  'reject',
  1,
  ts.damage_reject_deduction_pct,
  40.00,
  1 * 40.00 * ts.damage_reject_deduction_pct / 100,
  'rejected',
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1),
  NOW(),
  false
FROM tenants t
JOIN tenant_settings ts ON ts.tenant_id = t.id
JOIN users u ON u.tenant_id = t.id AND u.role = 'wager'
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Miscellaneous damage at godown (no wager, owner absorbs)
INSERT INTO damage_records (tenant_id, product_id, detection_point, grade, damage_count, deduction_rate_pct, production_cost_per_piece, total_deduction, approval_status, is_miscellaneous, notes)
SELECT
  t.id,
  p.id,
  'godown',
  'minor',
  5,
  ts.damage_minor_deduction_pct,
  40.00,
  5 * 40.00 * ts.damage_minor_deduction_pct / 100,
  'pending',
  true,
  'Found during godown inspection, wager unidentifiable'
FROM tenants t
JOIN tenant_settings ts ON ts.tenant_id = t.id
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;
