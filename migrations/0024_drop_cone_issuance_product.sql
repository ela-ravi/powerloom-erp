-- Migration: Drop product_id from cone_issuances
-- Cones are generic raw material, not tied to any specific product.
-- Product association happens at the production stage (paavu/woven), not at issuance.

ALTER TABLE cone_issuances DROP COLUMN IF EXISTS product_id;
