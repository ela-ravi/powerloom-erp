-- Migration: Cone Issuance Items (multi-color/weight per issuance)
-- Adds cone_issuance_items child table and migrates existing data

-- 1. Create cone_issuance_items table
CREATE TABLE cone_issuance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  cone_issuance_id UUID NOT NULL REFERENCES cone_issuances(id) ON DELETE CASCADE,
  color VARCHAR(100) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  quantity_kg DECIMAL(12,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cone_issuance_items_tenant_issuance ON cone_issuance_items(tenant_id, cone_issuance_id);

-- RLS
ALTER TABLE cone_issuance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY cone_issuance_item_tenant_isolation ON cone_issuance_items
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Trigger for updated_at
CREATE TRIGGER set_cone_issuance_items_updated_at
  BEFORE UPDATE ON cone_issuance_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Add total_quantity_kg to parent table
ALTER TABLE cone_issuances ADD COLUMN total_quantity_kg DECIMAL(12,3);

-- 3. Migrate existing data: copy each issuance's color/batch_id/quantity_kg into items
INSERT INTO cone_issuance_items (tenant_id, cone_issuance_id, color, batch_id, quantity_kg)
SELECT tenant_id, id, color, batch_id, quantity_kg
FROM cone_issuances;

-- 4. Backfill total_quantity_kg from existing quantity_kg
UPDATE cone_issuances SET total_quantity_kg = quantity_kg;

-- 5. Make total_quantity_kg NOT NULL now that it's backfilled
ALTER TABLE cone_issuances ALTER COLUMN total_quantity_kg SET NOT NULL;

-- 6. Drop old columns from parent
ALTER TABLE cone_issuances DROP COLUMN color;
ALTER TABLE cone_issuances DROP COLUMN batch_id;
ALTER TABLE cone_issuances DROP COLUMN quantity_kg;
