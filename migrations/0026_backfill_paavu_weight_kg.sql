-- Backfill weight_kg for paavu inventory rows from paavu_productions cone_weight_kg
UPDATE inventory inv
SET weight_kg = sub.total_cone_weight_kg
FROM (
  SELECT
    pp.tenant_id,
    pp.godown_id,
    pp.product_id,
    pp.color,
    COALESCE(pp.batch_id, '00000000-0000-0000-0000-000000000000') AS batch_key,
    SUM(pp.cone_weight_kg) AS total_cone_weight_kg
  FROM paavu_productions pp
  GROUP BY pp.tenant_id, pp.godown_id, pp.product_id, pp.color, batch_key
) sub
WHERE inv.stage = 'paavu'
  AND inv.tenant_id = sub.tenant_id
  AND inv.godown_id = sub.godown_id
  AND inv.product_id = sub.product_id
  AND inv.color = sub.color
  AND COALESCE(inv.batch_id, '00000000-0000-0000-0000-000000000000') = sub.batch_key
  AND inv.weight_kg IS NULL;
