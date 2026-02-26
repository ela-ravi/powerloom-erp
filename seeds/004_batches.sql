-- Phase 3: Batch Seeds
-- Requires: batch_enabled=true for Ravi Textiles

-- Enable batch system for Ravi Textiles
UPDATE tenant_settings SET batch_enabled = true
WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles');

-- Create batches with various statuses
INSERT INTO batches (tenant_id, batch_number, product_id, status, notes) VALUES
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'B-20260215-001',
    (SELECT id FROM products WHERE name = 'Khadi' AND size = '30x60' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles')),
    'in_progress',
    'Khadi White batch - February production'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'B-20260215-002',
    (SELECT id FROM products WHERE name = 'Jakkadu' AND size = '40x80' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles')),
    'open',
    'Jakkadu batch - pending start'
  ),
  (
    (SELECT id FROM tenants WHERE name = 'Ravi Textiles'),
    'B-20260210-001',
    (SELECT id FROM products WHERE name = 'Cotton Towel' AND size = '27x54' AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles')),
    'closed',
    'Cotton Towel batch - completed'
  );
