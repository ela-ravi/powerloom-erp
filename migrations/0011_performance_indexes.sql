-- Phase 13: Performance Indexes
-- Composite indexes for query optimization

-- Inventory Queries (highest traffic)
CREATE INDEX IF NOT EXISTS idx_inventory_lookup
  ON inventory(tenant_id, godown_id, product_id, color, stage);

CREATE INDEX IF NOT EXISTS idx_inventory_stage
  ON inventory(tenant_id, stage);

CREATE INDEX IF NOT EXISTS idx_inventory_batch
  ON inventory(tenant_id, batch_id)
  WHERE batch_id IS NOT NULL;

-- Production Queries
CREATE INDEX IF NOT EXISTS idx_production_returns_wager_date
  ON production_returns(tenant_id, wager_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_production_returns_batch
  ON production_returns(tenant_id, batch_id)
  WHERE batch_id IS NOT NULL;

-- Financial Queries
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status
  ON invoices(tenant_id, customer_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_overdue
  ON invoices(tenant_id, due_date)
  WHERE status IN ('issued', 'partially_paid');

-- Wage Queries
CREATE INDEX IF NOT EXISTS idx_wage_records_cycle_type
  ON wage_records(tenant_id, wage_cycle_id, worker_type);

CREATE INDEX IF NOT EXISTS idx_advance_transactions_wager_date
  ON advance_transactions(tenant_id, wager_id, created_at DESC);

-- Users by tenant and role
CREATE INDEX IF NOT EXISTS idx_users_tenant_role_active
  ON users(tenant_id, role)
  WHERE is_active = true;

-- Damage records by wager and status
CREATE INDEX IF NOT EXISTS idx_damage_records_wager_status
  ON damage_records(tenant_id, wager_id, approval_status);
