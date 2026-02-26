-- Migration 0013: Registration System
-- Adds invite_codes table for worker invite registration flow

-- Invite codes for worker onboarding
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(8) NOT NULL UNIQUE,
  role user_role NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  use_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invite_codes_tenant ON invite_codes(tenant_id);
CREATE INDEX idx_invite_codes_code ON invite_codes(code) WHERE is_active = TRUE;
CREATE INDEX idx_invite_codes_active ON invite_codes(tenant_id, is_active);

-- Updated_at trigger
CREATE TRIGGER set_invite_codes_updated_at
  BEFORE UPDATE ON invite_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY invite_codes_tenant_isolation ON invite_codes
  USING (tenant_id::text = current_setting('app.current_tenant', true));
