-- Migration: Configurable Wager Types
-- Replaces hardcoded wager_type SMALLINT (1-4) with a configurable wager_types table

-- 1. Create wager_types table
CREATE TABLE wager_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  wage_basis VARCHAR(20) NOT NULL CHECK (wage_basis IN ('per_kg', 'per_piece')),
  loom_ownership VARCHAR(20) NOT NULL CHECK (loom_ownership IN ('wager', 'owner')),
  work_scope VARCHAR(20) NOT NULL CHECK (work_scope IN ('paavu_oodai', 'oodai_only')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Trigger
CREATE TRIGGER set_wager_types_updated_at BEFORE UPDATE ON wager_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_wager_types_tenant ON wager_types(tenant_id);

-- RLS
ALTER TABLE wager_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY wager_types_tenant_isolation ON wager_types USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- 2. Seed 4 default types for every existing tenant
INSERT INTO wager_types (tenant_id, name, description, wage_basis, loom_ownership, work_scope)
SELECT t.id, 'Type 1', 'Own loom, Paavu + Oodai (per kg)', 'per_kg', 'wager', 'paavu_oodai'
FROM tenants t;

INSERT INTO wager_types (tenant_id, name, description, wage_basis, loom_ownership, work_scope)
SELECT t.id, 'Type 2', 'Own loom, Oodai only (per piece)', 'per_piece', 'wager', 'oodai_only'
FROM tenants t;

INSERT INTO wager_types (tenant_id, name, description, wage_basis, loom_ownership, work_scope)
SELECT t.id, 'Type 3', 'Owner''s loom, Paavu + Oodai (per kg)', 'per_kg', 'owner', 'paavu_oodai'
FROM tenants t;

INSERT INTO wager_types (tenant_id, name, description, wage_basis, loom_ownership, work_scope)
SELECT t.id, 'Type 4', 'Owner''s loom, Oodai only (per piece)', 'per_piece', 'owner', 'oodai_only'
FROM tenants t;

-- 3. Add wager_type_id column to wager_profiles
ALTER TABLE wager_profiles ADD COLUMN wager_type_id UUID;

-- 4. Populate wager_type_id by matching existing wager_type integer to seeded names
UPDATE wager_profiles wp
SET wager_type_id = wt.id
FROM wager_types wt
WHERE wt.tenant_id = wp.tenant_id
  AND wt.name = 'Type ' || wp.wager_type;

-- 5. Set NOT NULL, add FK constraint, drop old column
ALTER TABLE wager_profiles ALTER COLUMN wager_type_id SET NOT NULL;
ALTER TABLE wager_profiles ADD CONSTRAINT fk_wager_profiles_wager_type FOREIGN KEY (wager_type_id) REFERENCES wager_types(id);

-- Drop the old CHECK constraint and column
ALTER TABLE wager_profiles DROP CONSTRAINT IF EXISTS wager_profiles_wager_type_check;
ALTER TABLE wager_profiles DROP COLUMN wager_type;

-- 6. Add index on wager_type_id
CREATE INDEX idx_wager_profiles_wager_type ON wager_profiles(wager_type_id);
