-- Phase 8: Wage & Advance
-- Tables: advance_transactions, wage_cycles, wage_records

-- Enums
CREATE TYPE advance_type AS ENUM ('advance_given', 'advance_deduction', 'discretionary_addition');
CREATE TYPE wage_cycle_status AS ENUM ('draft', 'review', 'approved', 'paid');
CREATE TYPE worker_type AS ENUM ('wager', 'tailor', 'packager', 'paavu_oati');

-- Advance Transactions
CREATE TABLE advance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  wager_id UUID NOT NULL REFERENCES wager_profiles(id),
  type advance_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_advance_transactions_tenant_wager ON advance_transactions(tenant_id, wager_id);
CREATE INDEX idx_advance_transactions_tenant_created ON advance_transactions(tenant_id, created_at);

ALTER TABLE advance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY advance_transaction_tenant_isolation ON advance_transactions
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Wage Cycles
CREATE TABLE wage_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  cycle_number INTEGER NOT NULL,
  cycle_start_date DATE NOT NULL,
  cycle_end_date DATE NOT NULL,
  status wage_cycle_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_wage_cycles_tenant_number ON wage_cycles(tenant_id, cycle_number);
CREATE INDEX idx_wage_cycles_tenant_status ON wage_cycles(tenant_id, status);
CREATE INDEX idx_wage_cycles_tenant_dates ON wage_cycles(tenant_id, cycle_start_date, cycle_end_date);

CREATE TRIGGER set_wage_cycles_updated_at BEFORE UPDATE ON wage_cycles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE wage_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY wage_cycle_tenant_isolation ON wage_cycles
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Wage Records
CREATE TABLE wage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  wage_cycle_id UUID NOT NULL REFERENCES wage_cycles(id),
  worker_id UUID NOT NULL REFERENCES users(id),
  worker_type worker_type NOT NULL,
  gross_wage DECIMAL(12,2) NOT NULL DEFAULT 0,
  advance_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  damage_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_payable DECIMAL(12,2) NOT NULL DEFAULT 0,
  discretionary_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wage_records_tenant_cycle ON wage_records(tenant_id, wage_cycle_id);
CREATE INDEX idx_wage_records_tenant_worker ON wage_records(tenant_id, worker_id);

CREATE TRIGGER set_wage_records_updated_at BEFORE UPDATE ON wage_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE wage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY wage_record_tenant_isolation ON wage_records
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
