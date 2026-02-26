-- New field: how many kg of Oodai cones per Paavu
ALTER TABLE products ADD COLUMN oodai_kg_per_paavu DECIMAL(10,2);

-- Make old consumption fields optional (they'll be auto-computed or defaulted)
ALTER TABLE products ALTER COLUMN paavu_consumption_grams SET DEFAULT 0;
ALTER TABLE products ALTER COLUMN oodai_consumption_grams SET DEFAULT 0;
