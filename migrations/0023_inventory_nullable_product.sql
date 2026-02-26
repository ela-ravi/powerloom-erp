-- Migration: Make product_id nullable for raw_cone stage
-- Cones are generic raw material, not tied to any specific product

-- 1. Drop the existing unique index
DROP INDEX IF EXISTS idx_inventory_5dim;

-- 2. Make product_id nullable
ALTER TABLE inventory ALTER COLUMN product_id DROP NOT NULL;

-- 3. Recreate unique index with COALESCE for nullable product_id
CREATE UNIQUE INDEX idx_inventory_5dim ON inventory (
  tenant_id, godown_id,
  COALESCE(product_id, '00000000-0000-0000-0000-000000000000'),
  color, stage,
  COALESCE(batch_id, '00000000-0000-0000-0000-000000000000')
);

-- 4. Backfill: create raw_cone inventory from existing cone_purchases that have no inventory
INSERT INTO inventory (tenant_id, godown_id, product_id, color, stage, batch_id, quantity, weight_kg)
SELECT
  cp.tenant_id,
  cp.godown_id,
  NULL,
  cp.color,
  'raw_cone',
  cp.batch_id,
  SUM(cp.quantity_kg),
  SUM(cp.quantity_kg)
FROM cone_purchases cp
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_movements im
  WHERE im.reference_type = 'cone_purchase' AND im.reference_id = cp.id
)
GROUP BY cp.tenant_id, cp.godown_id, cp.color, cp.batch_id
ON CONFLICT DO NOTHING;

-- 5. Make cone_purchases.product_id nullable (cones are not product-specific)
ALTER TABLE cone_purchases ALTER COLUMN product_id DROP NOT NULL;
