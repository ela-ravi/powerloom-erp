-- Phase 7: Post-Production seed data
-- Depends on: 001-007 seeds

-- Tailoring records
INSERT INTO tailoring_records (tenant_id, tailor_id, godown_id, product_id, color, stitch_count, knot_count, stitch_wage, knot_wage, total_wage, mismatch_detected, created_by)
SELECT
  t.id,
  u.id,
  g.id,
  p.id,
  'White',
  100,
  50,
  100 * p.stitch_rate_per_piece,
  50 * p.knot_rate_per_piece,
  (100 * p.stitch_rate_per_piece) + (50 * p.knot_rate_per_piece),
  false,
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.role = 'tailor'
JOIN godowns g ON g.tenant_id = t.id AND g.is_main = true
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Tailoring record with knot_count = 0
INSERT INTO tailoring_records (tenant_id, tailor_id, godown_id, product_id, color, stitch_count, knot_count, stitch_wage, knot_wage, total_wage, mismatch_detected, created_by)
SELECT
  t.id,
  u.id,
  g.id,
  p.id,
  'Blue',
  75,
  0,
  75 * p.stitch_rate_per_piece,
  0,
  75 * p.stitch_rate_per_piece,
  false,
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.role = 'tailor'
JOIN godowns g ON g.tenant_id = t.id AND g.is_main = true
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Packaging records (small bundle)
INSERT INTO packaging_records (tenant_id, packager_id, godown_id, product_id, color, bundle_type, bundle_count, pieces_per_bundle, total_pieces, bundle_rate, total_wage, created_by)
SELECT
  t.id,
  u.id,
  g.id,
  p.id,
  'White',
  'small',
  8,
  p.small_bundle_count,
  8 * p.small_bundle_count,
  p.bundle_rate_small,
  8 * p.bundle_rate_small,
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.role = 'packager'
JOIN godowns g ON g.tenant_id = t.id AND g.is_main = true
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Packaging records (large bundle)
INSERT INTO packaging_records (tenant_id, packager_id, godown_id, product_id, color, bundle_type, bundle_count, pieces_per_bundle, total_pieces, bundle_rate, total_wage, created_by)
SELECT
  t.id,
  u.id,
  g.id,
  p.id,
  'White',
  'large',
  3,
  p.large_bundle_count,
  3 * p.large_bundle_count,
  p.bundle_rate_large,
  3 * p.bundle_rate_large,
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.role = 'packager'
JOIN godowns g ON g.tenant_id = t.id AND g.is_main = true
JOIN products p ON p.tenant_id = t.id AND p.name = 'Khadi 30x60'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;
