-- Migration: Product Oodai Weights
-- Stores the oodai (weft/cross-thread) weight in kg per paavu for each product.
-- Used to auto-populate cone issuance quantities for oodai-only wagers.

CREATE TABLE product_oodai_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  oodai_weight_kg DECIMAL(12,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, product_id)
);

CREATE INDEX idx_product_oodai_weights_tenant ON product_oodai_weights(tenant_id);

ALTER TABLE product_oodai_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_oodai_weight_tenant_isolation ON product_oodai_weights
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE TRIGGER set_product_oodai_weights_updated_at
  BEFORE UPDATE ON product_oodai_weights
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
