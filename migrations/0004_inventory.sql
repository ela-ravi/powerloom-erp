-- Phase 4: Inventory & Raw Materials

-- Enums
CREATE TYPE inventory_stage AS ENUM ('raw_cone', 'paavu', 'woven', 'tailored', 'bundled', 'sold');
CREATE TYPE movement_type AS ENUM ('increase', 'decrease', 'transfer_in', 'transfer_out');

-- Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  godown_id UUID NOT NULL REFERENCES godowns(id),
  product_id UUID NOT NULL REFERENCES products(id),
  color VARCHAR(100) NOT NULL,
  stage inventory_stage NOT NULL,
  batch_id UUID REFERENCES batches(id),
  quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
  weight_kg DECIMAL(12,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5-dimensional unique key using COALESCE for null batch_id
CREATE UNIQUE INDEX idx_inventory_5dim ON inventory (
  tenant_id, godown_id, product_id, color, stage,
  COALESCE(batch_id, '00000000-0000-0000-0000-000000000000')
);

CREATE INDEX idx_inventory_tenant_godown ON inventory(tenant_id, godown_id);
CREATE INDEX idx_inventory_tenant_stage ON inventory(tenant_id, stage);
CREATE INDEX idx_inventory_tenant_product ON inventory(tenant_id, product_id);

CREATE TRIGGER set_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_tenant_isolation ON inventory USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Inventory Movements
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  movement_type movement_type NOT NULL,
  quantity_change DECIMAL(12,3) NOT NULL,
  weight_change_kg DECIMAL(12,3),
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_tenant_inventory ON inventory_movements(tenant_id, inventory_id);
CREATE INDEX idx_movements_tenant_reference ON inventory_movements(tenant_id, reference_type, reference_id);
CREATE INDEX idx_movements_created_at ON inventory_movements(tenant_id, created_at);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY movements_tenant_isolation ON inventory_movements USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Cone Purchases
CREATE TABLE cone_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  godown_id UUID NOT NULL REFERENCES godowns(id),
  product_id UUID NOT NULL REFERENCES products(id),
  color VARCHAR(100) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  quantity_kg DECIMAL(12,3) NOT NULL,
  rate_per_kg DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  gst_rate_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  invoice_number VARCHAR(100),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cone_purchases_tenant ON cone_purchases(tenant_id);
CREATE INDEX idx_cone_purchases_tenant_supplier ON cone_purchases(tenant_id, supplier_id);
CREATE INDEX idx_cone_purchases_tenant_date ON cone_purchases(tenant_id, purchase_date);

CREATE TRIGGER set_cone_purchases_updated_at BEFORE UPDATE ON cone_purchases FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE cone_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY cone_purchases_tenant_isolation ON cone_purchases USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Inter-Godown Transfers
CREATE TABLE inter_godown_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_godown_id UUID NOT NULL REFERENCES godowns(id),
  dest_godown_id UUID NOT NULL REFERENCES godowns(id),
  product_id UUID NOT NULL REFERENCES products(id),
  color VARCHAR(100) NOT NULL,
  stage inventory_stage NOT NULL,
  batch_id UUID REFERENCES batches(id),
  quantity DECIMAL(12,3) NOT NULL,
  weight_kg DECIMAL(12,3),
  notes TEXT,
  transferred_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_godown_id != dest_godown_id)
);

CREATE INDEX idx_transfers_tenant ON inter_godown_transfers(tenant_id);
CREATE INDEX idx_transfers_tenant_source ON inter_godown_transfers(tenant_id, source_godown_id);
CREATE INDEX idx_transfers_tenant_dest ON inter_godown_transfers(tenant_id, dest_godown_id);

ALTER TABLE inter_godown_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY transfers_tenant_isolation ON inter_godown_transfers USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
