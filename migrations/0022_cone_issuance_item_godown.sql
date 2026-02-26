-- Migration: Add per-item godown to cone_issuance_items
-- Each item can optionally come from a different godown

ALTER TABLE cone_issuance_items
  ADD COLUMN godown_id UUID REFERENCES godowns(id);

-- Backfill from parent's godown_id
UPDATE cone_issuance_items cii
SET godown_id = ci.godown_id
FROM cone_issuances ci
WHERE cii.cone_issuance_id = ci.id;

-- Make NOT NULL after backfill
ALTER TABLE cone_issuance_items
  ALTER COLUMN godown_id SET NOT NULL;
