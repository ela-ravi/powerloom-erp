-- Phase 9: Sales & Finance seed data
-- Depends on: 001-008 seeds

-- Create an invoice (draft)
INSERT INTO invoices (tenant_id, invoice_number, customer_id, invoice_date, due_date, tax_type, subtotal, cgst_amount, sgst_amount, igst_amount, total_amount, amount_paid, balance_due, status, created_by)
SELECT
  t.id,
  'INV-00001',
  c.id,
  '2026-02-15',
  '2026-03-17',
  (CASE WHEN t.state_code = c.state_code THEN 'intra_state' ELSE 'inter_state' END)::tax_type,
  5000.00,
  CASE WHEN t.state_code = c.state_code THEN 125.00 ELSE 0.00 END,
  CASE WHEN t.state_code = c.state_code THEN 125.00 ELSE 0.00 END,
  CASE WHEN t.state_code != c.state_code THEN 250.00 ELSE 0.00 END,
  5250.00,
  0,
  5250.00,
  'draft',
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
JOIN customers c ON c.tenant_id = t.id
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Create invoice items
INSERT INTO invoice_items (tenant_id, invoice_id, product_id, color, quantity, unit_price, line_total, gst_rate_pct, hsn_code)
SELECT
  t.id,
  inv.id,
  p.id,
  'White',
  50,
  100.00,
  5000.00,
  COALESCE(p.gst_rate_pct, 5.00),
  p.hsn_code
FROM tenants t
JOIN invoices inv ON inv.tenant_id = t.id AND inv.invoice_number = 'INV-00001'
JOIN products p ON p.tenant_id = t.id
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Issue the invoice (change status)
UPDATE invoices SET status = 'issued'
WHERE invoice_number = 'INV-00001'
  AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles' LIMIT 1);

-- Record a partial payment
INSERT INTO payments (tenant_id, invoice_id, customer_id, amount, payment_method, payment_date, reference_number, created_by)
SELECT
  t.id,
  inv.id,
  inv.customer_id,
  2000.00,
  'upi',
  '2026-02-16',
  'UPI-REF-001',
  (SELECT u2.id FROM users u2 WHERE u2.tenant_id = t.id AND u2.role = 'owner' LIMIT 1)
FROM tenants t
JOIN invoices inv ON inv.tenant_id = t.id AND inv.invoice_number = 'INV-00001'
WHERE t.name = 'Ravi Textiles'
LIMIT 1;

-- Update invoice after payment
UPDATE invoices SET
  amount_paid = 2000.00,
  balance_due = 3250.00,
  status = 'partially_paid'
WHERE invoice_number = 'INV-00001'
  AND tenant_id = (SELECT id FROM tenants WHERE name = 'Ravi Textiles' LIMIT 1);
