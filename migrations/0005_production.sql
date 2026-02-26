-- Phase 5: Production System
-- Tables: shifts, cone_issuances, paavu_productions, production_returns, loom_downtimes

-- Enums
CREATE TYPE downtime_reason AS ENUM ('mechanical', 'electrical', 'material_shortage', 'other');

-- Shifts table (feature flag: shift_enabled)
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_shifts_tenant ON shifts(tenant_id);

-- Cone Issuances
CREATE TABLE cone_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  wager_id UUID NOT NULL REFERENCES users(id),
  godown_id UUID NOT NULL REFERENCES godowns(id),
  product_id UUID NOT NULL REFERENCES products(id),
  color VARCHAR(100) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  quantity_kg DECIMAL(12,3) NOT NULL,
  issued_by UUID NOT NULL REFERENCES users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cone_issuances_tenant_wager ON cone_issuances(tenant_id, wager_id);
CREATE INDEX idx_cone_issuances_tenant_date ON cone_issuances(tenant_id, issued_at);

-- Paavu Productions
CREATE TABLE paavu_productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  paavu_oati_id UUID NOT NULL REFERENCES users(id),
  godown_id UUID NOT NULL REFERENCES godowns(id),
  product_id UUID NOT NULL REFERENCES products(id),
  color VARCHAR(100) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  cone_weight_kg DECIMAL(12,3) NOT NULL,
  paavu_count INTEGER NOT NULL,
  wastage_grams DECIMAL(10,2) NOT NULL DEFAULT 0,
  wastage_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paavu_productions_tenant_oati ON paavu_productions(tenant_id, paavu_oati_id);
CREATE INDEX idx_paavu_productions_tenant_date ON paavu_productions(tenant_id, production_date);

-- Production Returns
CREATE TABLE production_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  wager_id UUID NOT NULL REFERENCES users(id),
  loom_id UUID NOT NULL REFERENCES looms(id),
  godown_id UUID NOT NULL REFERENCES godowns(id),
  product_id UUID NOT NULL REFERENCES products(id),
  color VARCHAR(100) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  shift_id UUID REFERENCES shifts(id),
  piece_count INTEGER,
  weight_kg DECIMAL(12,3),
  wastage_kg DECIMAL(10,3) NOT NULL DEFAULT 0,
  wastage_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_production_returns_tenant_wager ON production_returns(tenant_id, wager_id);
CREATE INDEX idx_production_returns_tenant_date ON production_returns(tenant_id, return_date);
CREATE INDEX idx_production_returns_tenant_loom ON production_returns(tenant_id, loom_id);
CREATE INDEX idx_production_returns_tenant_product ON production_returns(tenant_id, product_id);

-- Loom Downtimes
CREATE TABLE loom_downtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  loom_id UUID NOT NULL REFERENCES looms(id),
  wager_id UUID REFERENCES users(id),
  reason downtime_reason NOT NULL,
  custom_reason VARCHAR(255),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  reported_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_downtimes_tenant_loom ON loom_downtimes(tenant_id, loom_id);
CREATE INDEX idx_downtimes_tenant_wager ON loom_downtimes(tenant_id, wager_id);
CREATE INDEX idx_downtimes_tenant_dates ON loom_downtimes(tenant_id, start_time, end_time);

-- Triggers for updated_at
CREATE TRIGGER set_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_cone_issuances_updated_at BEFORE UPDATE ON cone_issuances FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_paavu_productions_updated_at BEFORE UPDATE ON paavu_productions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_production_returns_updated_at BEFORE UPDATE ON production_returns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_loom_downtimes_updated_at BEFORE UPDATE ON loom_downtimes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS Policies
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cone_issuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE paavu_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE loom_downtimes ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_tenant_isolation ON shifts
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY cone_issuance_tenant_isolation ON cone_issuances
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY paavu_production_tenant_isolation ON paavu_productions
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY production_return_tenant_isolation ON production_returns
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY downtime_tenant_isolation ON loom_downtimes
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
