-- Phase 9: Sales & Finance
-- Tables: invoices, invoice_items, payments

-- Enums
CREATE TYPE tax_type AS ENUM ('intra_state', 'inter_state');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'bank_transfer', 'cheque', 'other');

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_number VARCHAR(50) NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  tax_type tax_type NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(12,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'draft',
  eway_bill_number VARCHAR(50),
  batch_id UUID REFERENCES batches(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_invoices_tenant_number ON invoices(tenant_id, invoice_number);
CREATE INDEX idx_invoices_tenant_customer ON invoices(tenant_id, customer_id);
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_tenant_due_date ON invoices(tenant_id, due_date);

CREATE TRIGGER set_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Invoice Items
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  color VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  gst_rate_pct DECIMAL(5,2) NOT NULL,
  hsn_code VARCHAR(20),
  batch_id UUID REFERENCES batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_tenant_invoice ON invoice_items(tenant_id, invoice_id);

CREATE TRIGGER set_invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_item_tenant_isolation ON invoice_items
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number VARCHAR(100),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant_invoice ON payments(tenant_id, invoice_id);
CREATE INDEX idx_payments_tenant_customer ON payments(tenant_id, customer_id);
CREATE INDEX idx_payments_tenant_date ON payments(tenant_id, payment_date);

CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_tenant_isolation ON payments
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
