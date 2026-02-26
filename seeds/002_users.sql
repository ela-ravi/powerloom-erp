-- Seed: Users for both tenants (all roles)

-- Tenant 1: Ravi Textiles
-- Super Admin (platform-wide)
INSERT INTO users (id, tenant_id, phone, name, role)
VALUES ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '+919000000001', 'Platform Admin', 'super_admin');

-- Owner
INSERT INTO users (id, tenant_id, phone, name, role)
VALUES ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '+919876543210', 'Ravi Kumar', 'owner');

-- Staff
INSERT INTO users (id, tenant_id, phone, name, role)
VALUES ('a1111111-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', '+919876543212', 'Senthil Staff', 'staff');

INSERT INTO staff_permissions (tenant_id, user_id, permission) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-222222222222', 'production_entry'),
  ('11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-222222222222', 'godown_management'),
  ('11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-222222222222', 'master_data');

-- Wager Type 1 (own loom, paavu+oodai, per kg)
INSERT INTO users (id, tenant_id, phone, name, role)
VALUES ('a1111111-1111-1111-1111-333333333333', '11111111-1111-1111-1111-111111111111', '+919876543213', 'Muthu Wager T1', 'wager');

-- Wager Type 2 (own loom, oodai only, per piece)
INSERT INTO users (id, tenant_id, phone, name, role)
VALUES ('a1111111-1111-1111-1111-444444444444', '11111111-1111-1111-1111-111111111111', '+919876543214', 'Vel Wager T2', 'wager');

-- Wager Type 3 (owner loom, paavu+oodai, per kg)
INSERT INTO users (id, tenant_id, phone, name, role)
VALUES ('a1111111-1111-1111-1111-555555555555', '11111111-1111-1111-1111-111111111111', '+919876543215', 'Kannan Wager T3', 'wager');

-- Wager Type 4 (owner loom, oodai only, per piece)
INSERT INTO users (id, tenant_id, phone, name, role)
VALUES ('a1111111-1111-1111-1111-666666666666', '11111111-1111-1111-1111-111111111111', '+919876543216', 'Raj Wager T4', 'wager');

-- Tailor
INSERT INTO users (id, tenant_id, phone, name, role)
VALUES ('a1111111-1111-1111-1111-777777777777', '11111111-1111-1111-1111-111111111111', '+919876543217', 'Arjun Tailor', 'tailor');

-- Packager
INSERT INTO users (id, tenant_id, phone, name, role)
VALUES ('a1111111-1111-1111-1111-888888888888', '11111111-1111-1111-1111-111111111111', '+919876543218', 'Bala Packager', 'packager');

-- Tenant 2: Kumar Textiles
INSERT INTO users (id, tenant_id, phone, name, role)
VALUES ('a2222222-2222-2222-2222-111111111111', '22222222-2222-2222-2222-222222222222', '+919876543211', 'Kumar Selvam', 'owner');

INSERT INTO users (id, tenant_id, phone, name, role)
VALUES ('a2222222-2222-2222-2222-333333333333', '22222222-2222-2222-2222-222222222222', '+919876543219', 'Durai Wager', 'wager');
