-- Add paavu_oati as a user role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'paavu_oati';

-- Create paavu_oati_profiles table (mirrors wager_profiles without wager_type)
CREATE TABLE paavu_oati_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  advance_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_advance DECIMAL(12,2) NOT NULL DEFAULT 0,
  additional_advances DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paavu_oati_profiles_tenant ON paavu_oati_profiles(tenant_id);
CREATE INDEX idx_paavu_oati_profiles_tenant_active ON paavu_oati_profiles(tenant_id, is_active);

CREATE TRIGGER set_paavu_oati_profiles_updated_at
  BEFORE UPDATE ON paavu_oati_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE paavu_oati_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY paavu_oati_profiles_tenant_isolation ON paavu_oati_profiles
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
