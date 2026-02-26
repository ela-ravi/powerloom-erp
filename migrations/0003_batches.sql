-- Phase 3: Batch System

-- Enums
CREATE TYPE batch_status AS ENUM ('open', 'in_progress', 'closed');

-- Batches
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  batch_number VARCHAR(50) NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  status batch_status NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, batch_number)
);

-- Triggers
CREATE TRIGGER set_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_batches_tenant ON batches(tenant_id);
CREATE INDEX idx_batches_tenant_product ON batches(tenant_id, product_id);
CREATE INDEX idx_batches_tenant_status ON batches(tenant_id, status);

-- RLS
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY batches_tenant_isolation ON batches USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
