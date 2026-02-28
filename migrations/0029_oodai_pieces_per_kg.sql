-- Migration: Add pieces_per_kg to product_oodai_weights
-- Stores how many pieces of product can be produced from a given oodai weight in KGs.
-- E.g., for oodai of weight 24KG, 98 pieces of units can be produced.

ALTER TABLE product_oodai_weights
  ADD COLUMN pieces_per_kg INTEGER NULL;
