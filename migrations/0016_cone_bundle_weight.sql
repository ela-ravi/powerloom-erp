-- Configurable cone bundle weight (default 60 kg)
ALTER TABLE tenant_settings ADD COLUMN cone_bundle_weight_kg DECIMAL(10,2) NOT NULL DEFAULT 60;
