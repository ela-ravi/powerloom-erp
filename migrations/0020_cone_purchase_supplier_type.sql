ALTER TABLE cone_purchases ADD COLUMN supplier_type VARCHAR(100);
ALTER TABLE cone_purchases ALTER COLUMN product_id DROP NOT NULL;
