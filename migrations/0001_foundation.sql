-- Phase 1: Foundation tables
-- Tenants, Users, Auth, Audit

-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial');
CREATE TYPE user_role AS ENUM ('super_admin', 'owner', 'staff', 'wager', 'tailor', 'packager');

-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  phone VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(255),
  address TEXT,
  state_code VARCHAR(2) NOT NULL,
  gstin VARCHAR(15),
  status tenant_status NOT NULL DEFAULT 'trial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant Settings
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id),
  batch_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  shift_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  inter_godown_transfer_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  auth_otp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auth_pin_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  wage_cycle_day SMALLINT NOT NULL DEFAULT 0,
  default_credit_period_days INTEGER NOT NULL DEFAULT 30,
  paavu_wastage_limit_grams INTEGER NOT NULL DEFAULT 500,
  damage_minor_deduction_pct DECIMAL(5,2) NOT NULL DEFAULT 25.00,
  damage_major_deduction_pct DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  damage_reject_deduction_pct DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  rate_per_paavu DECIMAL(10,2) NOT NULL DEFAULT 0,
  show_wager_ranking BOOLEAN NOT NULL DEFAULT FALSE,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  phone VARCHAR(15) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  pin_hash VARCHAR(255),
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

-- Staff Permissions
CREATE TABLE staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  permission VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

-- OTP Codes
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) NOT NULL,
  code VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger
CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX idx_staff_permissions_user ON staff_permissions(user_id);
CREATE INDEX idx_staff_permissions_tenant ON staff_permissions(tenant_id);
CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX idx_otp_codes_expires ON otp_codes(expires_at);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- RLS Policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenants
  USING (id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_settings_isolation ON tenant_settings
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY staff_permissions_tenant_isolation ON staff_permissions
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
