-- Migration: Add paavu length & configurable units
-- Adds unit settings to tenant_settings and paavu_length to products

-- tenant_settings: configurable units
ALTER TABLE tenant_settings ADD COLUMN product_size_unit VARCHAR(10) NOT NULL DEFAULT 'inches';
ALTER TABLE tenant_settings ADD COLUMN paavu_length_unit VARCHAR(10) NOT NULL DEFAULT 'meters';

-- products: paavu length for auto-calculating pieces_per_paavu
ALTER TABLE products ADD COLUMN paavu_length DECIMAL(10,4);
