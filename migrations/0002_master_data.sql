-- Phase 2: Master Data Tables

-- Enums
CREATE TYPE loom_ownership AS ENUM ('owner', 'wager');
CREATE TYPE maintenance_status AS ENUM ('operational', 'under_maintenance', 'idle');
CREATE TYPE product_category AS ENUM ('single', 'double', 'triple', 'quad');
CREATE TYPE color_pricing_mode AS ENUM ('average', 'per_color');
CREATE TYPE shift_type AS ENUM ('morning', 'evening', 'night');
CREATE TYPE customer_type AS ENUM ('wholesale_partial', 'wholesale_bill_to_bill', 'retail');
CREATE TYPE godown_type AS ENUM ('godown', 'paavu_pattarai');

-- Loom Types
CREATE TABLE loom_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  nickname VARCHAR(50),
  capacity_pieces_per_day INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Looms
CREATE TABLE looms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  loom_type_id UUID NOT NULL REFERENCES loom_types(id),
  loom_number VARCHAR(50) NOT NULL,
  assigned_wager_id UUID REFERENCES users(id),
  ownership loom_ownership NOT NULL,
  maintenance_status maintenance_status NOT NULL DEFAULT 'operational',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, loom_number)
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  size VARCHAR(20) NOT NULL,
  category product_category NOT NULL,
  paavu_to_piece_ratio DECIMAL(10,4) NOT NULL,
  paavu_consumption_grams DECIMAL(10,2) NOT NULL,
  paavu_wastage_grams DECIMAL(10,2) NOT NULL DEFAULT 0,
  paavu_wastage_pct DECIMAL(5,2),
  oodai_consumption_grams DECIMAL(10,2) NOT NULL,
  oodai_wastage_grams DECIMAL(10,2) NOT NULL DEFAULT 0,
  oodai_wastage_pct DECIMAL(5,2),
  wage_rate_per_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
  wage_rate_per_piece DECIMAL(10,2) NOT NULL DEFAULT 0,
  stitch_rate_per_piece DECIMAL(10,2) NOT NULL DEFAULT 0,
  knot_rate_per_piece DECIMAL(10,2) NOT NULL DEFAULT 0,
  small_bundle_count INTEGER NOT NULL DEFAULT 10,
  large_bundle_count INTEGER NOT NULL DEFAULT 50,
  bundle_rate_small DECIMAL(10,2) NOT NULL DEFAULT 0,
  bundle_rate_large DECIMAL(10,2) NOT NULL DEFAULT 0,
  gst_rate_pct DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  color_pricing_mode color_pricing_mode NOT NULL DEFAULT 'average',
  hsn_code VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name, size)
);

-- Product Color Prices
CREATE TABLE product_color_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  color VARCHAR(50) NOT NULL,
  selling_price_per_piece DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, color)
);

-- Shift Wage Rates
CREATE TABLE shift_wage_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  shift shift_type NOT NULL,
  wage_rate_per_kg DECIMAL(10,2) NOT NULL,
  wage_rate_per_piece DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, shift)
);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(15),
  address TEXT,
  gstin VARCHAR(15),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(15),
  address TEXT,
  state_code VARCHAR(2) NOT NULL,
  gstin VARCHAR(15),
  customer_type customer_type NOT NULL,
  credit_period_days INTEGER NOT NULL DEFAULT 30,
  outstanding_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Godowns
CREATE TABLE godowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  is_main BOOLEAN NOT NULL DEFAULT FALSE,
  godown_type godown_type NOT NULL DEFAULT 'godown',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wager Profiles
CREATE TABLE wager_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  wager_type SMALLINT NOT NULL CHECK (wager_type BETWEEN 1 AND 4),
  advance_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_advance DECIMAL(12,2) NOT NULL DEFAULT 0,
  additional_advances DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers
CREATE TRIGGER set_loom_types_updated_at BEFORE UPDATE ON loom_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_looms_updated_at BEFORE UPDATE ON looms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_product_color_prices_updated_at BEFORE UPDATE ON product_color_prices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_shift_wage_rates_updated_at BEFORE UPDATE ON shift_wage_rates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_godowns_updated_at BEFORE UPDATE ON godowns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_wager_profiles_updated_at BEFORE UPDATE ON wager_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_loom_types_tenant ON loom_types(tenant_id);
CREATE INDEX idx_looms_tenant ON looms(tenant_id);
CREATE INDEX idx_looms_type ON looms(loom_type_id);
CREATE INDEX idx_looms_wager ON looms(assigned_wager_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_category ON products(tenant_id, category);
CREATE INDEX idx_product_color_prices_product ON product_color_prices(product_id);
CREATE INDEX idx_shift_wage_rates_product ON shift_wage_rates(product_id);
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_type ON customers(tenant_id, customer_type);
CREATE INDEX idx_godowns_tenant ON godowns(tenant_id);
CREATE INDEX idx_wager_profiles_tenant ON wager_profiles(tenant_id);
CREATE INDEX idx_wager_profiles_user ON wager_profiles(user_id);

-- RLS
ALTER TABLE loom_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE looms ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_color_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_wage_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE godowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wager_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY loom_types_tenant_isolation ON loom_types USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
CREATE POLICY looms_tenant_isolation ON looms USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
CREATE POLICY products_tenant_isolation ON products USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
CREATE POLICY product_color_prices_tenant_isolation ON product_color_prices USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
CREATE POLICY shift_wage_rates_tenant_isolation ON shift_wage_rates USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
CREATE POLICY suppliers_tenant_isolation ON suppliers USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
CREATE POLICY customers_tenant_isolation ON customers USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
CREATE POLICY godowns_tenant_isolation ON godowns USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
CREATE POLICY wager_profiles_tenant_isolation ON wager_profiles USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
