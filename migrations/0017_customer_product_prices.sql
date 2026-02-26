-- Customer-specific product pricing
-- One rate per product per customer (not per color)

CREATE TABLE customer_product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  selling_price_per_piece DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

CREATE INDEX idx_customer_product_prices_customer ON customer_product_prices(customer_id);
CREATE INDEX idx_customer_product_prices_tenant ON customer_product_prices(tenant_id);
