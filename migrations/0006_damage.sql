-- Phase 6: Damage Management
-- Tables: damage_records

-- Enums
CREATE TYPE detection_point AS ENUM ('loom', 'tailoring', 'packaging', 'godown');
CREATE TYPE damage_grade AS ENUM ('minor', 'major', 'reject');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Damage Records
CREATE TABLE damage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  production_return_id UUID REFERENCES production_returns(id),
  wager_id UUID REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  detection_point detection_point NOT NULL,
  grade damage_grade NOT NULL,
  damage_count INTEGER NOT NULL,
  deduction_rate_pct DECIMAL(5,2) NOT NULL,
  production_cost_per_piece DECIMAL(10,2) NOT NULL,
  total_deduction DECIMAL(12,2) NOT NULL,
  approval_status approval_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  is_miscellaneous BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_damage_records_tenant_wager ON damage_records(tenant_id, wager_id);
CREATE INDEX idx_damage_records_tenant_status ON damage_records(tenant_id, approval_status);
CREATE INDEX idx_damage_records_tenant_detection ON damage_records(tenant_id, detection_point);
CREATE INDEX idx_damage_records_tenant_product ON damage_records(tenant_id, product_id);
CREATE INDEX idx_damage_records_tenant_return ON damage_records(tenant_id, production_return_id);

-- Trigger for updated_at
CREATE TRIGGER set_damage_records_updated_at BEFORE UPDATE ON damage_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE damage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY damage_record_tenant_isolation ON damage_records
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
