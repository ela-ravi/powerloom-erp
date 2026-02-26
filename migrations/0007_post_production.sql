-- Phase 7: Post-Production (Tailoring & Packaging)
-- Tables: tailoring_records, packaging_records

-- Enums
CREATE TYPE bundle_type AS ENUM ('small', 'large');

-- Tailoring Records
CREATE TABLE tailoring_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  tailor_id UUID NOT NULL REFERENCES users(id),
  godown_id UUID NOT NULL REFERENCES godowns(id),
  product_id UUID NOT NULL REFERENCES products(id),
  color VARCHAR(100) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  stitch_count INTEGER NOT NULL,
  knot_count INTEGER NOT NULL DEFAULT 0,
  stitch_wage DECIMAL(10,2) NOT NULL,
  knot_wage DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_wage DECIMAL(10,2) NOT NULL,
  mismatch_detected BOOLEAN NOT NULL DEFAULT FALSE,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tailoring_records_tenant_tailor ON tailoring_records(tenant_id, tailor_id);
CREATE INDEX idx_tailoring_records_tenant_date ON tailoring_records(tenant_id, work_date);
CREATE INDEX idx_tailoring_records_tenant_product ON tailoring_records(tenant_id, product_id);

CREATE TRIGGER set_tailoring_records_updated_at BEFORE UPDATE ON tailoring_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE tailoring_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY tailoring_record_tenant_isolation ON tailoring_records
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Packaging Records
CREATE TABLE packaging_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  packager_id UUID NOT NULL REFERENCES users(id),
  godown_id UUID NOT NULL REFERENCES godowns(id),
  product_id UUID NOT NULL REFERENCES products(id),
  color VARCHAR(100) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  bundle_type bundle_type NOT NULL,
  bundle_count INTEGER NOT NULL,
  pieces_per_bundle INTEGER NOT NULL,
  total_pieces INTEGER NOT NULL,
  bundle_rate DECIMAL(10,2) NOT NULL,
  total_wage DECIMAL(10,2) NOT NULL,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_packaging_records_tenant_packager ON packaging_records(tenant_id, packager_id);
CREATE INDEX idx_packaging_records_tenant_date ON packaging_records(tenant_id, work_date);
CREATE INDEX idx_packaging_records_tenant_product ON packaging_records(tenant_id, product_id);

CREATE TRIGGER set_packaging_records_updated_at BEFORE UPDATE ON packaging_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE packaging_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY packaging_record_tenant_isolation ON packaging_records
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
