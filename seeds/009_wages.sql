-- Phase 8: Wage & Advance seed data
-- Depends on: 001-008 seeds

-- Issue advance to wager
INSERT INTO advance_transactions (tenant_id, wager_id, type, amount, balance_after, notes, created_by)
SELECT
  t.id,
  wp.id,
  'advance_given',
  5000.00,
  5000.00,
  'Initial weekly advance',
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
JOIN wager_profiles wp ON wp.tenant_id = t.id AND wp.is_active = true
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Create a wage cycle
INSERT INTO wage_cycles (tenant_id, cycle_number, cycle_start_date, cycle_end_date, status, created_by)
SELECT
  t.id,
  1,
  '2026-02-10',
  '2026-02-16',
  'draft',
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Create wage record for wager
INSERT INTO wage_records (tenant_id, wage_cycle_id, worker_id, worker_type, gross_wage, advance_deduction, damage_deduction, net_payable)
SELECT
  t.id,
  wc.id,
  u.id,
  'wager',
  3500.00,
  500.00,
  30.00,
  2970.00
FROM tenants t
JOIN wage_cycles wc ON wc.tenant_id = t.id AND wc.cycle_number = 1
JOIN users u ON u.tenant_id = t.id AND u.role = 'wager'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Create wage record for tailor
INSERT INTO wage_records (tenant_id, wage_cycle_id, worker_id, worker_type, gross_wage, net_payable)
SELECT
  t.id,
  wc.id,
  u.id,
  'tailor',
  2500.00,
  2500.00
FROM tenants t
JOIN wage_cycles wc ON wc.tenant_id = t.id AND wc.cycle_number = 1
JOIN users u ON u.tenant_id = t.id AND u.role = 'tailor'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;
