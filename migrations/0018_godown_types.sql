-- Create godown_types master table
CREATE TABLE godown_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Migrate godowns.godown_type from ENUM to VARCHAR
ALTER TABLE godowns ALTER COLUMN godown_type TYPE VARCHAR(100) USING godown_type::text;

-- Drop the default that references the old enum type
ALTER TABLE godowns ALTER COLUMN godown_type DROP DEFAULT;

-- Drop the old enum type
DROP TYPE godown_type;

-- Set new VARCHAR default
ALTER TABLE godowns ALTER COLUMN godown_type SET DEFAULT 'godown';

-- Seed default godown types for every existing tenant
INSERT INTO godown_types (tenant_id, name)
SELECT id, 'godown' FROM tenants
UNION ALL
SELECT id, 'paavu_pattarai' FROM tenants;
