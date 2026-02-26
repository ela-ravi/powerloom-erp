-- Seed: Two tenants with settings

-- Tenant 1: Ravi Textiles (Tamil Nadu)
INSERT INTO tenants (id, name, owner_name, phone, email, state_code, gstin, status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Ravi Textiles',
  'Ravi Kumar',
  '+919876543210',
  'ravi@ravitextiles.com',
  'TN',
  '33AABCU9603R1ZM',
  'active'
);

INSERT INTO tenant_settings (tenant_id, batch_enabled, shift_enabled, auth_otp_enabled, auth_pin_enabled, wage_cycle_day)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  true, false, true, true, 0
);

-- Tenant 2: Kumar Textiles (Karnataka)
INSERT INTO tenants (id, name, owner_name, phone, state_code, status)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Kumar Textiles',
  'Kumar Selvam',
  '+919876543211',
  'KA',
  'active'
);

INSERT INTO tenant_settings (tenant_id, batch_enabled, shift_enabled, auth_otp_enabled, auth_pin_enabled)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  false, true, true, false
);
