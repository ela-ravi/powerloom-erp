-- Phase 10: Notifications & Alerts seed data
-- Depends on: 001-010 seeds

-- Create notification for owner
INSERT INTO notifications (tenant_id, user_id, event_type, title, message, priority, reference_type)
SELECT
  t.id,
  u.id,
  'damage_reported',
  'Damage Report',
  'A new damage record has been reported on loom production',
  'high',
  'damage_record'
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Create notification for wager
INSERT INTO notifications (tenant_id, user_id, event_type, title, message, priority)
SELECT
  t.id,
  u.id,
  'wage_paid',
  'Wage Paid',
  'Your weekly wage has been processed',
  'medium'
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.role = 'wager'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Create a fraud alert
INSERT INTO fraud_alerts (tenant_id, alert_type, severity, description, reference_type)
SELECT
  t.id,
  'excess_wastage',
  'high',
  'Wastage percentage exceeds 5% threshold in paavu production',
  'paavu_production'
FROM tenants t
WHERE t.name = 'Ravi Textiles'
LIMIT 1;
