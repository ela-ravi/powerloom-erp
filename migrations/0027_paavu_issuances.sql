-- Migration: Paavu Issuances
-- Records issuance of pre-prepared paavu (warp) from inventory to Type 2/4 wagers

-- 1. Parent table
CREATE TABLE paavu_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  wager_id UUID NOT NULL REFERENCES users(id),
  godown_id UUID NOT NULL REFERENCES godowns(id),
  total_paavu_count INTEGER NOT NULL,
  total_weight_kg DECIMAL(12,3) NOT NULL,
  issued_by UUID NOT NULL REFERENCES users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paavu_issuances_tenant ON paavu_issuances(tenant_id);
CREATE INDEX idx_paavu_issuances_wager ON paavu_issuances(tenant_id, wager_id);
CREATE INDEX idx_paavu_issuances_godown ON paavu_issuances(tenant_id, godown_id);

ALTER TABLE paavu_issuances ENABLE ROW LEVEL SECURITY;

CREATE POLICY paavu_issuance_tenant_isolation ON paavu_issuances
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE TRIGGER set_paavu_issuances_updated_at
  BEFORE UPDATE ON paavu_issuances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Child items table
CREATE TABLE paavu_issuance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  paavu_issuance_id UUID NOT NULL REFERENCES paavu_issuances(id) ON DELETE CASCADE,
  godown_id UUID NOT NULL REFERENCES godowns(id),
  product_id UUID NOT NULL REFERENCES products(id),
  color VARCHAR(100) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  paavu_count INTEGER NOT NULL,
  weight_kg DECIMAL(12,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paavu_issuance_items_tenant ON paavu_issuance_items(tenant_id, paavu_issuance_id);

ALTER TABLE paavu_issuance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY paavu_issuance_item_tenant_isolation ON paavu_issuance_items
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE TRIGGER set_paavu_issuance_items_updated_at
  BEFORE UPDATE ON paavu_issuance_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
