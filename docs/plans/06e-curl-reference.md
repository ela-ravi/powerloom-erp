# Curl Reference — Powerloom ERP V3

> Complete curl commands for all ~112 endpoints
>
> Back to [Implementation Guide](./06-implementation-guide.md)

---

## Setup & Environment Variables

### Environment Configuration

```bash
# Base URL
export BASE_URL="http://localhost:3000/api"

# Tenant IDs (created during setup)
export TENANT_A_ID="<tenant-a-uuid>"
export TENANT_B_ID="<tenant-b-uuid>"

# Entity IDs (populated as you create resources)
export USER_ID="<user-uuid>"
export WAGER_ID="<wager-profile-uuid>"
export PRODUCT_ID="<product-uuid>"
export GODOWN_ID="<godown-uuid>"
export LOOM_ID="<loom-uuid>"
export BATCH_ID="<batch-uuid>"
export INVOICE_ID="<invoice-uuid>"
export CUSTOMER_ID="<customer-uuid>"
export SUPPLIER_ID="<supplier-uuid>"
export CYCLE_ID="<wage-cycle-uuid>"
```

### Auth Token Generation

Get tokens for each role to test role-based access control:

```bash
# Step 1: Send OTP (for any role)
curl -s -X POST "$BASE_URL/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
# → 200 { "message": "OTP sent", "expiresIn": 300 }

# Step 2: Verify OTP → get JWT
curl -s -X POST "$BASE_URL/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "code": "123456"}'
# → 200 { "token": "eyJ...", "refreshToken": "eyJ...", "user": { "id", "role", "tenantId" } }

# Store tokens per role
export OWNER_TOKEN="<jwt-from-owner-login>"
export STAFF_TOKEN="<jwt-from-staff-login>"
export WAGER_TOKEN="<jwt-from-wager-login>"
export TAILOR_TOKEN="<jwt-from-tailor-login>"
export PACKAGER_TOKEN="<jwt-from-packager-login>"
export SUPER_ADMIN_TOKEN="<jwt-from-super-admin-login>"

# Helper: Auth header shortcut
alias auth_owner='curl -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json"'
```

### PIN Authentication (Alternative)

```bash
# Set PIN (authenticated)
curl -s -X PUT "$BASE_URL/auth/pin" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
# → 200 { "message": "PIN set successfully" }

# Login with PIN
curl -s -X POST "$BASE_URL/auth/pin/verify" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "pin": "1234"}'
# → 200 { "token": "eyJ...", "user": { ... } }
```

---

## 1. Health Check (Phase 0)

```bash
# Health check — no auth required
curl -s "$BASE_URL/health"
# → 200 { "status": "ok", "timestamp": "2026-...", "version": "1.0.0" }
```

---

## 2. Auth Module (Phase 1)

### POST /api/auth/otp/send

```bash
# Happy path
curl -s -X POST "$BASE_URL/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
# → 200 { "message": "OTP sent", "expiresIn": 300 }

# Error: invalid phone format
curl -s -X POST "$BASE_URL/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"phone": "invalid"}'
# → 400 { "error": { "code": "VALIDATION_ERROR", "message": "Invalid phone format" } }

# Error: inactive user
curl -s -X POST "$BASE_URL/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'
# → 403 { "error": { "code": "USER_INACTIVE", "message": "User account is inactive" } }

# Error: OTP not enabled for tenant
curl -s -X POST "$BASE_URL/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543211"}'
# → 400 { "error": { "code": "AUTH_METHOD_DISABLED", "message": "OTP authentication not enabled" } }
```

### POST /api/auth/otp/verify

```bash
# Happy path
curl -s -X POST "$BASE_URL/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "code": "123456"}'
# → 200 {
#   "token": "eyJ...",
#   "refreshToken": "eyJ...",
#   "user": {
#     "id": "uuid", "tenantId": "uuid", "name": "Owner Name",
#     "role": "owner", "phone": "+919876543210",
#     "language": "en",
#     "tenantSettings": { "batchEnabled": false, "shiftEnabled": false, ... }
#   }
# }

# Error: invalid OTP
curl -s -X POST "$BASE_URL/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "code": "000000"}'
# → 401 { "error": { "code": "INVALID_OTP", "message": "Invalid or expired OTP" } }

# Error: expired OTP
# → 401 { "error": { "code": "OTP_EXPIRED", "message": "OTP has expired" } }
```

### POST /api/auth/pin/verify

```bash
# Happy path
curl -s -X POST "$BASE_URL/auth/pin/verify" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "pin": "1234"}'
# → 200 { "token": "eyJ...", "user": { ... } }

# Error: wrong PIN
# → 401 { "error": { "code": "INVALID_PIN", "message": "Invalid PIN" } }

# Error: PIN auth disabled
# → 400 { "error": { "code": "AUTH_METHOD_DISABLED", "message": "PIN authentication not enabled" } }

# Error: no PIN set
# → 400 { "error": { "code": "PIN_NOT_SET", "message": "PIN not set for this user" } }
```

### PUT /api/auth/pin

```bash
# Set/update PIN (authenticated)
curl -s -X PUT "$BASE_URL/auth/pin" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin": "5678"}'
# → 200 { "message": "PIN updated successfully" }

# Error: PIN not 4 digits
curl -s -X PUT "$BASE_URL/auth/pin" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin": "12"}'
# → 400 { "error": { "code": "VALIDATION_ERROR", "message": "PIN must be exactly 4 digits" } }

# Error: unauthenticated
curl -s -X PUT "$BASE_URL/auth/pin" \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
# → 401 { "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }
```

### POST /api/auth/refresh

```bash
# Refresh token
curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJ..."}'
# → 200 { "token": "eyJ...(new)", "refreshToken": "eyJ...(new)" }

# Error: expired refresh token
# → 401 { "error": { "code": "TOKEN_EXPIRED", "message": "Refresh token expired" } }
```

### GET /api/auth/me

```bash
# Get current user profile
curl -s "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "id": "uuid", "tenantId": "uuid", "name": "Owner",
#   "role": "owner", "phone": "+919876543210",
#   "permissions": [],
#   "tenantSettings": { "batchEnabled": false, ... }
# }
```

---

## 3. Tenant Management (Phase 1)

### POST /api/tenants

```bash
# Create tenant (super_admin only)
curl -s -X POST "$BASE_URL/tenants" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sri Lakshmi Textiles",
    "ownerName": "Rajesh Kumar",
    "phone": "+919876543210",
    "email": "rajesh@example.com",
    "address": "45 Gandhi Nagar, Erode, Tamil Nadu",
    "stateCode": "33",
    "gstin": "33AABCT1234F1Z5"
  }'
# → 201 { "id": "uuid", "name": "Sri Lakshmi Textiles", "status": "trial", ... }

# Error: non-super_admin
curl -s -X POST "$BASE_URL/tenants" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "ownerName": "Test", "phone": "+91..."}'
# → 403 { "error": { "code": "FORBIDDEN", "message": "Super admin access required" } }

# Error: duplicate phone
# → 409 { "error": { "code": "DUPLICATE", "message": "Phone number already registered" } }
```

### GET /api/tenants

```bash
# List tenants (super_admin only, paginated)
curl -s "$BASE_URL/tenants?limit=10&offset=0" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
# → 200 { "data": [...], "total": 5, "limit": 10, "offset": 0 }
```

### GET /api/tenants/:id

```bash
# Get tenant details
curl -s "$BASE_URL/tenants/$TENANT_A_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
# → 200 { "id": "uuid", "name": "Sri Lakshmi Textiles", ... }

# Error: not found
curl -s "$BASE_URL/tenants/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
# → 404 { "error": { "code": "NOT_FOUND", "message": "Tenant not found" } }
```

### PUT /api/tenants/:id

```bash
# Update tenant
curl -s -X PUT "$BASE_URL/tenants/$TENANT_A_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Sri Lakshmi Textiles Pvt Ltd", "email": "info@srilakshmi.com"}'
# → 200 { "id": "uuid", "name": "Sri Lakshmi Textiles Pvt Ltd", ... }
```

### PUT /api/tenants/:id/status

```bash
# Update tenant status
curl -s -X PUT "$BASE_URL/tenants/$TENANT_A_ID/status" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
# → 200 { "id": "uuid", "status": "active" }
```

---

## 4. Tenant Settings (Phase 1)

### GET /api/tenants/:id/settings

```bash
# Get tenant settings (owner or super_admin)
curl -s "$BASE_URL/tenants/$TENANT_A_ID/settings" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "batchEnabled": false, "shiftEnabled": false,
#   "interGodownTransferEnabled": false,
#   "authOtpEnabled": true, "authPinEnabled": false,
#   "wageCycleDay": 0, "defaultCreditPeriodDays": 30,
#   "paavuWastageLimitGrams": 500,
#   "damageMinorDeductionPct": "25.00",
#   "damageMajorDeductionPct": "50.00",
#   "damageRejectDeductionPct": "100.00",
#   "showWagerRanking": false, "currency": "INR", "locale": "en"
# }
```

### PUT /api/tenants/:id/settings

```bash
# Update tenant settings
curl -s -X PUT "$BASE_URL/tenants/$TENANT_A_ID/settings" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchEnabled": true,
    "shiftEnabled": true,
    "wageCycleDay": 6,
    "damageMinorDeductionPct": "30.00"
  }'
# → 200 { "batchEnabled": true, "shiftEnabled": true, "wageCycleDay": 6, ... }

# Error: invalid wage cycle day
curl -s -X PUT "$BASE_URL/tenants/$TENANT_A_ID/settings" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wageCycleDay": 7}'
# → 400 { "error": { "code": "VALIDATION_ERROR", "details": [{ "field": "wageCycleDay", "message": "Must be 0-6" }] } }
```

---

## 5. User Management (Phase 1)

### POST /api/users

```bash
# Create user (owner/admin)
curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543211",
    "name": "Murugan K",
    "role": "wager",
    "language": "ta"
  }'
# → 201 {
#   "id": "uuid", "phone": "+919876543211", "name": "Murugan K",
#   "role": "wager", "isActive": true,
#   "wagerProfile": { "id": "uuid", "wagerType": 1, "advanceBalance": "0.00" }
# }

# Create staff user
curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543212",
    "name": "Senthil M",
    "role": "staff"
  }'
# → 201 { "id": "uuid", "role": "staff", ... }

# Error: duplicate phone in same tenant
curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543211", "name": "Duplicate", "role": "staff"}'
# → 409 { "error": { "code": "DUPLICATE", "message": "Phone number already exists in this tenant" } }

# Error: wager trying to create user
curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $WAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543299", "name": "Test", "role": "staff"}'
# → 403 { "error": { "code": "FORBIDDEN", "message": "Insufficient permissions" } }

# Tenant isolation: same phone in different tenant → allowed
curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_B_ID" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543211", "name": "Same Phone Diff Tenant", "role": "staff"}'
# → 201 (allowed — different tenant)
```

### GET /api/users

```bash
# List users (paginated, filterable)
curl -s "$BASE_URL/users?limit=20&offset=0&role=wager" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [...], "total": 12, "limit": 20, "offset": 0 }

# Filter by role
curl -s "$BASE_URL/users?role=staff" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "role": "staff", ... }], ... }
```

### GET /api/users/:id

```bash
# Get user details
curl -s "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "id": "uuid", "name": "Murugan K", "role": "wager", ... }

# Tenant isolation: user from another tenant
curl -s "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_B_ID"
# → 404 (not visible to Tenant B)
```

### PUT /api/users/:id

```bash
# Update user
curl -s -X PUT "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Murugan Kumar", "language": "en"}'
# → 200 { "id": "uuid", "name": "Murugan Kumar", ... }
```

### PUT /api/users/:id/deactivate

```bash
# Deactivate user (soft delete)
curl -s -X PUT "$BASE_URL/users/$USER_ID/deactivate" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "id": "uuid", "isActive": false }
```

### GET /api/users/:id/permissions

```bash
# Get staff permissions
curl -s "$BASE_URL/users/$USER_ID/permissions" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "permissions": ["master_data", "production", "inventory"] }
```

### PUT /api/users/:id/permissions

```bash
# Set staff permissions (replace all)
curl -s -X PUT "$BASE_URL/users/$USER_ID/permissions" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissions": ["master_data", "production", "inventory", "wages"]}'
# → 200 { "permissions": ["master_data", "production", "inventory", "wages"] }

# Error: non-staff user
curl -s -X PUT "$BASE_URL/users/$WAGER_ID/permissions" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissions": ["master_data"]}'
# → 400 { "error": { "code": "INVALID_ROLE", "message": "Permissions only apply to staff users" } }
```

---

## 5b. Registration & Invite System (Phase 1b)

### Public Tenant Registration

#### POST /api/register/otp/send

```bash
# Send registration OTP
curl -s -X POST "$BASE_URL/register/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'
# → 200 { "data": { "message": "OTP sent" } }
```

#### POST /api/register/tenant

```bash
# Register tenant (creates tenant + settings + owner, returns auth tokens)
curl -s -X POST "$BASE_URL/register/tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "New Textiles",
    "ownerName": "Ravi Kumar",
    "phone": "+919876543210",
    "stateCode": "33",
    "otpCode": "123456"
  }'
# → 200 {
#   "data": {
#     "accessToken": "eyJ...",
#     "refreshToken": "eyJ...",
#     "user": { "id": "uuid", "name": "Ravi Kumar", "role": "owner", "tenantId": "uuid" },
#     "featureFlags": { "batching": true, "shifts": false, ... }
#   }
# }

# Error: invalid OTP
curl -s -X POST "$BASE_URL/register/tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "New Textiles",
    "ownerName": "Ravi Kumar",
    "phone": "+919876543210",
    "stateCode": "33",
    "otpCode": "999999"
  }'
# → 401 { "error": { "code": "INVALID_OTP", "message": "Invalid or expired OTP" } }

# Error: phone already registered
curl -s -X POST "$BASE_URL/register/tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Duplicate Textiles",
    "ownerName": "Another Owner",
    "phone": "+919876543210",
    "stateCode": "33",
    "otpCode": "123456"
  }'
# → 409 { "error": { "code": "PHONE_EXISTS", "message": "Phone number already registered" } }
```

---

### Worker Invite Flow (Public)

#### GET /api/register/invite/:code

```bash
# Validate invite code
curl -s "$BASE_URL/register/invite/ABC123"
# → 200 { "data": { "valid": true, "role": "wager", "tenantName": "Sri Murugan Textiles" } }

# Error: invalid/expired code
curl -s "$BASE_URL/register/invite/INVALID"
# → 404 { "error": { "code": "INVITE_NOT_FOUND", "message": "Invalid or expired invite code" } }

# Error: code fully used
curl -s "$BASE_URL/register/invite/MAXED123"
# → 400 { "error": { "code": "INVITE_EXHAUSTED", "message": "Invite code has reached maximum uses" } }
```

#### POST /api/register/invite/otp/send

```bash
# Send OTP for invite registration
curl -s -X POST "$BASE_URL/register/invite/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"code": "ABC123", "phone": "+919876543211"}'
# → 200 { "data": { "message": "OTP sent" } }

# Error: phone already exists in tenant
curl -s -X POST "$BASE_URL/register/invite/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"code": "ABC123", "phone": "+919876543210"}'
# → 409 { "error": { "code": "PHONE_EXISTS", "message": "User already exists in this tenant" } }
```

#### POST /api/register/invite

```bash
# Redeem invite (creates user in tenant, returns auth tokens)
curl -s -X POST "$BASE_URL/register/invite" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ABC123",
    "name": "Muthu S.",
    "phone": "+919876543211",
    "otpCode": "654321"
  }'
# → 200 {
#   "data": {
#     "accessToken": "eyJ...",
#     "refreshToken": "eyJ...",
#     "user": { "id": "uuid", "name": "Muthu S.", "role": "wager", "tenantId": "uuid" }
#   }
# }

# Error: invalid OTP
curl -s -X POST "$BASE_URL/register/invite" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ABC123",
    "name": "Muthu S.",
    "phone": "+919876543211",
    "otpCode": "999999"
  }'
# → 401 { "error": { "code": "INVALID_OTP", "message": "Invalid or expired OTP" } }
```

---

### Invite Code Management (Owner/Staff)

#### POST /api/invites

```bash
# Create invite code
curl -s -X POST "$BASE_URL/invites" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "wager", "maxUses": 5, "expiresInDays": 30}'
# → 201 {
#   "data": {
#     "id": "uuid",
#     "code": "XYZ789",
#     "role": "wager",
#     "maxUses": 5,
#     "usedCount": 0,
#     "expiresAt": "2026-03-24T...",
#     "isActive": true,
#     "createdAt": "2026-02-22T..."
#   }
# }

# Error: invalid role
curl -s -X POST "$BASE_URL/invites" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "owner", "maxUses": 5, "expiresInDays": 30}'
# → 400 { "error": { "code": "INVALID_ROLE", "message": "Cannot create invite for owner role" } }

# Error: staff without permission
curl -s -X POST "$BASE_URL/invites" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "wager", "maxUses": 5, "expiresInDays": 30}'
# → 403 { "error": { "code": "FORBIDDEN", "message": "Insufficient permissions" } }
```

#### GET /api/invites

```bash
# List invite codes
curl -s "$BASE_URL/invites?limit=20&offset=0" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "data": [
#     {
#       "id": "uuid",
#       "code": "XYZ789",
#       "role": "wager",
#       "maxUses": 5,
#       "usedCount": 2,
#       "expiresAt": "2026-03-24T...",
#       "isActive": true,
#       "createdAt": "2026-02-22T..."
#     }
#   ],
#   "pagination": { "total": 15, "limit": 20, "offset": 0 }
# }

# Filter by role
curl -s "$BASE_URL/invites?role=wager&limit=20" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [...], "pagination": {...} }

# Filter by active status
curl -s "$BASE_URL/invites?isActive=true&limit=20" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [...], "pagination": {...} }
```

#### PUT /api/invites/:id/deactivate

```bash
# Deactivate invite code
export INVITE_ID="uuid-of-invite"
curl -s -X PUT "$BASE_URL/invites/$INVITE_ID/deactivate" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": { "message": "Invite code deactivated" } }

# Error: already deactivated
curl -s -X PUT "$BASE_URL/invites/$INVITE_ID/deactivate" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 400 { "error": { "code": "ALREADY_DEACTIVATED", "message": "Invite code is already inactive" } }

# Error: not found
curl -s -X PUT "$BASE_URL/invites/invalid-uuid/deactivate" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 404 { "error": { "code": "NOT_FOUND", "message": "Invite not found" } }
```

---

### Super Admin: Create Tenant with Owner

#### POST /api/tenants/with-owner

```bash
# Create tenant + owner in one step
curl -s -X POST "$BASE_URL/tenants/with-owner" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kumar Textiles",
    "ownerName": "Kumar M.",
    "phone": "+919876543299",
    "stateCode": "29"
  }'
# → 201 {
#   "data": {
#     "id": "uuid",
#     "name": "Kumar Textiles",
#     "status": "trial",
#     "stateCode": "29",
#     "createdAt": "2026-02-22T...",
#     "owner": {
#       "id": "uuid",
#       "name": "Kumar M.",
#       "phone": "+919876543299",
#       "role": "owner"
#     }
#   }
# }

# Error: non-super_admin
curl -s -X POST "$BASE_URL/tenants/with-owner" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Textiles",
    "ownerName": "Test Owner",
    "phone": "+919999999999",
    "stateCode": "33"
  }'
# → 403 { "error": { "code": "FORBIDDEN", "message": "Super admin access required" } }

# Error: duplicate phone
curl -s -X POST "$BASE_URL/tenants/with-owner" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Duplicate Textiles",
    "ownerName": "Another Owner",
    "phone": "+919876543299",
    "stateCode": "29"
  }'
# → 409 { "error": { "code": "PHONE_EXISTS", "message": "Phone number already registered" } }
```

---

## 6. Loom Types (Phase 2)

### POST /api/loom-types

```bash
# Create loom type
curl -s -X POST "$BASE_URL/loom-types" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Power Loom 48 inch",
    "widthInches": 48,
    "capacityPiecesPerDay": 12
  }'
# → 201 { "id": "uuid", "name": "Power Loom 48 inch", "capacityPiecesPerDay": 12, ... }

# Error: duplicate name
curl -s -X POST "$BASE_URL/loom-types" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Power Loom 48 inch", "widthInches": 48, "capacityPiecesPerDay": 12}'
# → 409 { "error": { "code": "DUPLICATE", "message": "Loom type name already exists" } }

# Error: invalid capacity
curl -s -X POST "$BASE_URL/loom-types" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Invalid", "widthInches": 48, "capacityPiecesPerDay": -1}'
# → 400 { "error": { "code": "VALIDATION_ERROR", "message": "Capacity must be positive" } }
```

### GET /api/loom-types

```bash
# List loom types
curl -s "$BASE_URL/loom-types" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "name": "Power Loom 48 inch", ... }] }
```

### PUT /api/loom-types/:id

```bash
# Update loom type
curl -s -X PUT "$BASE_URL/loom-types/$LOOM_TYPE_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"capacityPiecesPerDay": 14}'
# → 200 { "id": "uuid", "capacityPiecesPerDay": 14, ... }
```

---

## 7. Looms (Phase 2)

### POST /api/looms

```bash
# Create loom (note: uses loomNumber field, not serialNumber)
curl -s -X POST "$BASE_URL/looms" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "loomNumber": "LM-001",
    "loomTypeId": "'$LOOM_TYPE_ID'",
    "ownership": "owner"
  }'
# → 201 { "id": "uuid", "loomNumber": "LM-001", "loomTypeId": "uuid", "ownership": "owner", "maintenanceStatus": "operational", "isActive": true, ... }

# Error: duplicate loom number
# → 409 { "error": { "code": "DUPLICATE", "message": "Loom number already exists" } }
```

### GET /api/looms

```bash
# List looms (with filters, returns joined fields from loom_types and users tables)
curl -s "$BASE_URL/looms?isActive=true&loomTypeId=$LOOM_TYPE_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "data": [{
#     "id": "uuid",
#     "loomNumber": "LM-001",
#     "loomTypeId": "uuid",
#     "loomTypeName": "Single Lengthy",
#     "ownership": "owner",
#     "assignedWagerId": null,
#     "wagerName": null,
#     "ownerName": "Ravi Kumar",
#     "maintenanceStatus": "operational",
#     "isActive": true,
#     "createdAt": "2026-02-20T10:00:00Z",
#     "updatedAt": "2026-02-20T10:00:00Z"
#   }],
#   "pagination": { "total": 1, "limit": 20, "offset": 0, "hasMore": false }
# }
```

### PUT /api/looms/:id

```bash
# Update loom
curl -s -X PUT "$BASE_URL/looms/$LOOM_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maintenanceStatus": "under_maintenance"}'
# → 200 { "id": "uuid", "maintenanceStatus": "under_maintenance", ... }
```

### PUT /api/looms/:id/assign

```bash
# Assign wager to loom
curl -s -X PUT "$BASE_URL/looms/$LOOM_ID/assign" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wagerId": "'$WAGER_ID'"}'
# → 200 { "id": "uuid", "assignedWagerId": "uuid", "assignedWagerName": "Murugan K" }

# Error: assign non-wager
curl -s -X PUT "$BASE_URL/looms/$LOOM_ID/assign" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wagerId": "'$STAFF_USER_ID'"}'
# → 400 { "error": { "code": "INVALID_ROLE", "message": "User is not a wager" } }
```

---

## 8. Products (Phase 2)

### POST /api/products

```bash
# Create product (full schema)
curl -s -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Khadi Premium",
    "size": "30x60",
    "category": "single",
    "hsnCode": "63026090",
    "paavuConsumptionPerPiece": "0.15",
    "oodaiConsumptionPerPiece": "0.25",
    "wageRatePerKg": "45.00",
    "wageRatePerPiece": "8.50",
    "stitchRatePerPiece": "3.00",
    "knotRatePerPiece": "2.00",
    "bundleCountSmall": 6,
    "bundleCountLarge": 12,
    "bundleRateSmall": "5.00",
    "bundleRateLarge": "8.00",
    "gstRatePct": "5.00",
    "sellingPricePerPiece": "120.00",
    "colorPricingMode": "uniform"
  }'
# → 201 { "id": "uuid", "name": "Khadi Premium", ... }

# Error: duplicate (name, size)
# → 409 { "error": { "code": "DUPLICATE", "message": "Product with this name and size already exists" } }
```

### GET /api/products

```bash
# List products (with filters)
curl -s "$BASE_URL/products?category=single&isActive=true" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "name": "Khadi Premium", ... }] }
```

### PUT /api/products/:id

```bash
# Update product
curl -s -X PUT "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sellingPricePerPiece": "130.00", "gstRatePct": "12.00"}'
# → 200 { "id": "uuid", "sellingPricePerPiece": "130.00", ... }
```

---

## 9. Product Color Prices (Phase 2)

### POST /api/products/:id/color-prices

```bash
# Add color price (only when colorPricingMode='per_color')
curl -s -X POST "$BASE_URL/products/$PRODUCT_ID/color-prices" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"color": "White", "pricePerPiece": "110.00"}'
# → 201 { "id": "uuid", "color": "White", "pricePerPiece": "110.00" }

# Error: duplicate (product, color)
# → 409 { "error": { "code": "DUPLICATE", "message": "Color price already exists for this product" } }
```

### GET /api/products/:id/color-prices

```bash
curl -s "$BASE_URL/products/$PRODUCT_ID/color-prices" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "color": "White", "pricePerPiece": "110.00" }, ...] }
```

### PUT /api/products/:id/color-prices/:priceId

```bash
curl -s -X PUT "$BASE_URL/products/$PRODUCT_ID/color-prices/$COLOR_PRICE_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pricePerPiece": "115.00"}'
# → 200 { "color": "White", "pricePerPiece": "115.00" }
```

### DELETE /api/products/:id/color-prices/:priceId

```bash
curl -s -X DELETE "$BASE_URL/products/$PRODUCT_ID/color-prices/$COLOR_PRICE_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 204 (No Content)
```

---

## 10. Shift Wage Rates (Phase 2)

### POST /api/products/:id/shift-rates

```bash
# Add shift wage rate (only when shiftEnabled=true)
curl -s -X POST "$BASE_URL/products/$PRODUCT_ID/shift-rates" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shiftId": "'$SHIFT_ID'", "wageRatePerKg": "50.00", "wageRatePerPiece": "9.50"}'
# → 201 { "id": "uuid", "shiftId": "uuid", "wageRatePerKg": "50.00", ... }

# Error: shift tracking disabled
curl -s -X POST "$BASE_URL/products/$PRODUCT_ID/shift-rates" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shiftId": "uuid", "wageRatePerKg": "50.00"}'
# → 400 { "error": { "code": "FEATURE_DISABLED", "message": "Shift tracking is not enabled" } }
```

### GET /api/products/:id/shift-rates

```bash
curl -s "$BASE_URL/products/$PRODUCT_ID/shift-rates" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "shiftId": "uuid", "shiftName": "Morning", "wageRatePerKg": "50.00", ... }] }
```

### PUT /api/products/:id/shift-rates/:rateId

```bash
curl -s -X PUT "$BASE_URL/products/$PRODUCT_ID/shift-rates/$RATE_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wageRatePerKg": "52.00"}'
# → 200 { "wageRatePerKg": "52.00", ... }
```

---

## 11. Suppliers (Phase 2)

### POST /api/suppliers

```bash
curl -s -X POST "$BASE_URL/suppliers" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "KG Yarns Pvt Ltd",
    "phone": "+919876000001",
    "address": "12 Tiruppur Road, Erode",
    "stateCode": "33",
    "gstin": "33AABCK1234G1Z9"
  }'
# → 201 { "id": "uuid", "name": "KG Yarns Pvt Ltd", ... }
```

### GET /api/suppliers

```bash
curl -s "$BASE_URL/suppliers" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "name": "KG Yarns Pvt Ltd", ... }] }
```

### PUT /api/suppliers/:id

```bash
curl -s -X PUT "$BASE_URL/suppliers/$SUPPLIER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876000002"}'
# → 200 { "id": "uuid", "phone": "+919876000002", ... }
```

---

## 12. Customers (Phase 2)

### POST /api/customers

```bash
# Create customer
curl -s -X POST "$BASE_URL/customers" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chennai Wholesale Traders",
    "phone": "+919876100001",
    "address": "78 T.Nagar, Chennai",
    "stateCode": "33",
    "gstin": "33AABCC1234H1Z2",
    "customerType": "wholesale_partial",
    "creditPeriodDays": 45
  }'
# → 201 {
#   "id": "uuid", "name": "Chennai Wholesale Traders",
#   "customerType": "wholesale_partial", "creditPeriodDays": 45,
#   "outstandingBalance": "0.00", ...
# }

# Error: state_code missing
curl -s -X POST "$BASE_URL/customers" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "phone": "+91...", "customerType": "retail"}'
# → 400 { "error": { "code": "VALIDATION_ERROR", "details": [{ "field": "stateCode", "message": "Required" }] } }
```

### GET /api/customers

```bash
curl -s "$BASE_URL/customers?customerType=wholesale_partial&isActive=true" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "name": "Chennai Wholesale Traders", ... }] }
```

### PUT /api/customers/:id

```bash
curl -s -X PUT "$BASE_URL/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"creditPeriodDays": 60}'
# → 200 { "id": "uuid", "creditPeriodDays": 60, ... }
```

---

## 13. Godowns (Phase 2)

### POST /api/godowns

```bash
# Create main godown
curl -s -X POST "$BASE_URL/godowns" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Godown - Erode",
    "address": "Industrial Area, Erode",
    "godownType": "godown",
    "isMain": true
  }'
# → 201 { "id": "uuid", "name": "Main Godown - Erode", "isMain": true, ... }

# Create Paavu Pattarai
curl -s -X POST "$BASE_URL/godowns" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Paavu Pattarai - Unit 1",
    "godownType": "paavu_pattarai",
    "isMain": false
  }'
# → 201 { "id": "uuid", "godownType": "paavu_pattarai", ... }

# Error: second main godown
curl -s -X POST "$BASE_URL/godowns" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Another Main", "godownType": "godown", "isMain": true}'
# → 400 { "error": { "code": "CONSTRAINT_VIOLATION", "message": "Only one main godown per tenant" } }
```

### GET /api/godowns

```bash
curl -s "$BASE_URL/godowns?godownType=godown" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "name": "Main Godown - Erode", ... }] }
```

### PUT /api/godowns/:id

```bash
curl -s -X PUT "$BASE_URL/godowns/$GODOWN_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Main Godown - Erode (Expanded)"}'
# → 200 { "id": "uuid", "name": "Main Godown - Erode (Expanded)", ... }
```

---

## 14. Wager Profiles (Phase 2)

### GET /api/wagers

```bash
# List wager profiles (owner/staff, includes joined 'name' field from users table)
curl -s "$BASE_URL/wagers?wagerType=1&isActive=true" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "userId": "uuid", "name": "Murugan K", "wagerType": 1, "advanceBalance": "5000.00", ... }], "pagination": { ... } }
```

### GET /api/wagers/:id

```bash
# Get wager profile details
curl -s "$BASE_URL/wagers/$WAGER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "id": "uuid", "userId": "uuid", "name": "Murugan K",
#   "wagerType": 1, "advanceBalance": "5000.00",
#   "originalAdvance": "10000.00", "additionalAdvance": "0.00",
#   "assignedLooms": [{ "loomId": "uuid", "loomNumber": "L-001" }]
# }
```

### PUT /api/wagers/:id

```bash
# Update wager profile
curl -s -X PUT "$BASE_URL/wagers/$WAGER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wagerType": 2}'
# → 200 { "id": "uuid", "wagerType": 2 }

# Error: invalid wager type
curl -s -X PUT "$BASE_URL/wagers/$WAGER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wagerType": 5}'
# → 400 { "error": { "code": "VALIDATION_ERROR", "message": "Wager type must be 1-4" } }
```

### GET /api/wagers/me

```bash
# Wager self-service: view own profile
curl -s "$BASE_URL/wagers/me" \
  -H "Authorization: Bearer $WAGER_TOKEN"
# → 200 { "id": "uuid", "wagerType": 1, "advanceBalance": "5000.00", ... }
```

---

## 15. Batches (Phase 3)

### POST /api/batches

```bash
# Create batch (only when batchEnabled=true)
curl -s -X POST "$BASE_URL/batches" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'$PRODUCT_ID'",
    "color": "White",
    "targetQuantity": 500,
    "notes": "Q1 2026 batch"
  }'
# → 201 {
#   "id": "uuid", "batchNumber": "B-2026-001",
#   "productId": "uuid", "color": "White",
#   "status": "open", "targetQuantity": 500
# }

# Error: batch system disabled
curl -s -X POST "$BASE_URL/batches" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "'$PRODUCT_ID'", "color": "White"}'
# → 400 { "error": { "code": "FEATURE_DISABLED", "message": "Batch system is not enabled" } }
```

### GET /api/batches

```bash
curl -s "$BASE_URL/batches?status=open&productId=$PRODUCT_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "batchNumber": "B-2026-001", "status": "open", ... }] }
```

### PUT /api/batches/:id/status

```bash
# Transition: open → in_progress
curl -s -X PUT "$BASE_URL/batches/$BATCH_ID/status" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
# → 200 { "id": "uuid", "status": "in_progress" }

# Transition: in_progress → closed
curl -s -X PUT "$BASE_URL/batches/$BATCH_ID/status" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "closed"}'
# → 200 { "id": "uuid", "status": "closed" }

# Reopen: closed → open
curl -s -X PUT "$BASE_URL/batches/$BATCH_ID/status" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "open"}'
# → 200 { "id": "uuid", "status": "open" }

# Error: invalid transition (open → closed directly)
curl -s -X PUT "$BASE_URL/batches/$BATCH_ID/status" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "closed"}'
# → 400 { "error": { "code": "INVALID_TRANSITION", "message": "Cannot transition from open to closed" } }
```

---

## 16. Cone Purchases (Phase 4)

### POST /api/cone-purchases

```bash
# Record cone purchase
curl -s -X POST "$BASE_URL/cone-purchases" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": "'$SUPPLIER_ID'",
    "godownId": "'$GODOWN_ID'",
    "color": "White",
    "weightKg": "120.00",
    "costPerKg": "250.00",
    "gstRatePct": "5.00",
    "batchId": "'$BATCH_ID'",
    "invoiceNumber": "INV-SUP-001",
    "purchaseDate": "2026-02-15"
  }'
# → 201 {
#   "id": "uuid",
#   "weightKg": "120.00", "costPerKg": "250.00",
#   "totalCost": "30000.00", "gstAmount": "1500.00",
#   "inventoryMovement": { "type": "in", "stage": "raw_cone", "quantity": "120.00" }
# }

# Error: batchId required when batchEnabled
curl -s -X POST "$BASE_URL/cone-purchases" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"supplierId": "'$SUPPLIER_ID'", "godownId": "'$GODOWN_ID'", "color": "White", "weightKg": "60.00", "costPerKg": "250.00"}'
# → 400 { "error": { "code": "VALIDATION_ERROR", "message": "Batch ID required when batch system is enabled" } }
```

### GET /api/cone-purchases

```bash
curl -s "$BASE_URL/cone-purchases?supplierId=$SUPPLIER_ID&color=White" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "weightKg": "120.00", ... }] }
```

---

## 17. Inventory (Phase 4)

### GET /api/inventory

```bash
# List inventory (multi-dimensional filter)
curl -s "$BASE_URL/inventory?godownId=$GODOWN_ID&stage=raw_cone&color=White" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "data": [{
#     "godownId": "uuid", "godownName": "Main Godown",
#     "productId": "uuid", "productName": "Khadi Premium",
#     "color": "White", "stage": "raw_cone",
#     "quantityKg": "120.00", "quantityPieces": 0,
#     "batchId": "uuid", "batchNumber": "B-2026-001"
#   }]
# }

# Filter by batch
curl -s "$BASE_URL/inventory?batchId=$BATCH_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [...] }
```

### GET /api/inventory/summary

```bash
# Inventory summary by stage (6-stage pipeline overview)
curl -s "$BASE_URL/inventory/summary" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "stages": {
#     "raw_cone": { "totalKg": "1200.00", "items": 8 },
#     "paavu": { "totalCount": 450, "items": 5 },
#     "woven": { "totalPieces": 230, "totalKg": "345.00", "items": 12 },
#     "tailored": { "totalPieces": 180, "items": 9 },
#     "bundled": { "totalBundles": 25, "totalPieces": 150, "items": 6 },
#     "sold": { "totalPieces": 500, "items": 15 }
#   }
# }
```

### GET /api/inventory/:id/movements

```bash
# Movement history for an inventory item
curl -s "$BASE_URL/inventory/$INVENTORY_ID/movements" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "data": [
#     { "type": "in", "quantity": "120.00", "stage": "raw_cone", "source": "cone_purchase", "createdAt": "..." },
#     { "type": "out", "quantity": "60.00", "stage": "raw_cone", "source": "cone_issuance", "createdAt": "..." }
#   ]
# }
```

---

## 18. Inter-Godown Transfers (Phase 4)

### POST /api/transfers

```bash
# Transfer stock between godowns
curl -s -X POST "$BASE_URL/transfers" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceGodownId": "'$GODOWN_A_ID'",
    "destinationGodownId": "'$GODOWN_B_ID'",
    "productId": "'$PRODUCT_ID'",
    "color": "White",
    "stage": "tailored",
    "quantity": 50,
    "batchId": "'$BATCH_ID'"
  }'
# → 201 {
#   "id": "uuid",
#   "sourceGodownId": "uuid", "destinationGodownId": "uuid",
#   "quantity": 50, "stage": "tailored"
# }

# Error: transfer disabled
# → 400 { "error": { "code": "FEATURE_DISABLED", "message": "Inter-godown transfer is not enabled" } }

# Error: source = destination
# → 400 { "error": { "code": "VALIDATION_ERROR", "message": "Source and destination must be different" } }

# Error: insufficient stock
# → 400 { "error": { "code": "INSUFFICIENT_STOCK", "message": "Not enough stock in source godown" } }
```

### GET /api/transfers

```bash
curl -s "$BASE_URL/transfers?sourceGodownId=$GODOWN_A_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "sourceGodown": "Main", "destinationGodown": "Unit 2", ... }] }
```

---

## 19. Cone Issuances (Phase 5)

### POST /api/cone-issuances

```bash
# Issue cones to a wager for production
curl -s -X POST "$BASE_URL/cone-issuances" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wagerId": "'$WAGER_ID'",
    "godownId": "'$GODOWN_ID'",
    "productId": "'$PRODUCT_ID'",
    "color": "White",
    "weightKg": "30.00",
    "batchId": "'$BATCH_ID'"
  }'
# → 201 {
#   "id": "uuid", "wagerId": "uuid", "weightKg": "30.00",
#   "inventoryMovement": { "type": "out", "stage": "raw_cone", "quantity": "30.00" }
# }

# Error: insufficient stock
curl -s -X POST "$BASE_URL/cone-issuances" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wagerId": "'$WAGER_ID'", "godownId": "'$GODOWN_ID'", "productId": "'$PRODUCT_ID'", "color": "White", "weightKg": "9999.00"}'
# → 400 { "error": { "code": "INSUFFICIENT_STOCK", "message": "Not enough cone stock" } }
```

### GET /api/cone-issuances

```bash
curl -s "$BASE_URL/cone-issuances?wagerId=$WAGER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "wagerId": "uuid", "weightKg": "30.00", ... }] }
```

---

## 20. Paavu Productions (Phase 5)

### POST /api/paavu-productions

```bash
# Record paavu production
curl -s -X POST "$BASE_URL/paavu-productions" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paavuOatiId": "'$PAAVU_OATI_USER_ID'",
    "godownId": "'$PATTARAI_GODOWN_ID'",
    "productId": "'$PRODUCT_ID'",
    "color": "White",
    "paavuCount": 20,
    "coneWeightUsedKg": "8.00",
    "wastageKg": "0.30",
    "batchId": "'$BATCH_ID'"
  }'
# → 201 {
#   "id": "uuid", "paavuCount": 20, "wastageKg": "0.30",
#   "wastageFlag": false,
#   "inventoryTransitions": {
#     "coneDecrease": "8.00",
#     "paavuIncrease": 20
#   }
# }

# Wastage over limit → flag set
curl -s -X POST "$BASE_URL/paavu-productions" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paavuOatiId": "'$PAAVU_OATI_USER_ID'",
    "godownId": "'$PATTARAI_GODOWN_ID'",
    "productId": "'$PRODUCT_ID'",
    "color": "White",
    "paavuCount": 20,
    "coneWeightUsedKg": "10.00",
    "wastageKg": "0.60"
  }'
# → 201 { ..., "wastageFlag": true, ... }
```

### GET /api/paavu-productions

```bash
curl -s "$BASE_URL/paavu-productions?paavuOatiId=$PAAVU_OATI_USER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [...] }
```

---

## 21. Production Returns (Phase 5)

### POST /api/production-returns

```bash
# Type 1/3 wager: weight mandatory, count optional
curl -s -X POST "$BASE_URL/production-returns" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wagerId": "'$WAGER_ID'",
    "productId": "'$PRODUCT_ID'",
    "color": "White",
    "godownId": "'$GODOWN_ID'",
    "returnWeightKg": "25.50",
    "returnCount": 50,
    "batchId": "'$BATCH_ID'"
  }'
# → 201 {
#   "id": "uuid", "wagerId": "uuid",
#   "returnWeightKg": "25.50", "returnCount": 50,
#   "wastageKg": "4.50", "wastageFlag": false,
#   "inventoryMovement": { "type": "in", "stage": "woven", "quantityPieces": 50 }
# }

# Type 2/4 wager: count mandatory, weight optional
curl -s -X POST "$BASE_URL/production-returns" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wagerId": "'$WAGER_TYPE2_ID'",
    "productId": "'$PRODUCT_ID'",
    "color": "Blue",
    "godownId": "'$GODOWN_ID'",
    "returnCount": 40
  }'
# → 201 { "returnCount": 40, ... }

# Error: Type 1 wager missing weight
curl -s -X POST "$BASE_URL/production-returns" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wagerId": "'$WAGER_ID'", "productId": "'$PRODUCT_ID'", "color": "White", "godownId": "'$GODOWN_ID'", "returnCount": 50}'
# → 400 { "error": { "code": "VALIDATION_ERROR", "message": "Weight is required for Type 1/3 wagers" } }

# Error: Type 2 wager missing count
# → 400 { "error": { "code": "VALIDATION_ERROR", "message": "Count is required for Type 2/4 wagers" } }

# With shift (when shiftEnabled)
curl -s -X POST "$BASE_URL/production-returns" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wagerId": "'$WAGER_ID'",
    "productId": "'$PRODUCT_ID'",
    "color": "White",
    "godownId": "'$GODOWN_ID'",
    "returnWeightKg": "12.00",
    "shiftId": "'$SHIFT_ID'"
  }'
# → 201 { ..., "shiftId": "uuid", ... }
```

### GET /api/production-returns

```bash
curl -s "$BASE_URL/production-returns?wagerId=$WAGER_ID&dateFrom=2026-02-10&dateTo=2026-02-15" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [...] }

# Wager self-service: own returns only
curl -s "$BASE_URL/production-returns" \
  -H "Authorization: Bearer $WAGER_TOKEN"
# → 200 { "data": [... only own returns ...] }
```

---

## 22. Loom Downtimes (Phase 5)

### POST /api/loom-downtimes

```bash
# Record downtime
curl -s -X POST "$BASE_URL/loom-downtimes" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "loomId": "'$LOOM_ID'",
    "reason": "mechanical_failure",
    "startDate": "2026-02-14",
    "endDate": "2026-02-15",
    "notes": "Belt replacement needed"
  }'
# → 201 { "id": "uuid", "loomId": "uuid", "reason": "mechanical_failure", "downtimeDays": 1 }

# With custom reason
curl -s -X POST "$BASE_URL/loom-downtimes" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "loomId": "'$LOOM_ID'",
    "reason": "other",
    "customReason": "Power outage in area",
    "startDate": "2026-02-15"
  }'
# → 201 { "reason": "other", "customReason": "Power outage in area", "endDate": null }

# Error: wager recording for another's loom
curl -s -X POST "$BASE_URL/loom-downtimes" \
  -H "Authorization: Bearer $WAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"loomId": "'$OTHER_LOOM_ID'", "reason": "mechanical_failure", "startDate": "2026-02-15"}'
# → 403 { "error": { "code": "FORBIDDEN", "message": "Can only report downtime for your own loom" } }
```

### GET /api/loom-downtimes

```bash
curl -s "$BASE_URL/loom-downtimes?loomId=$LOOM_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "reason": "mechanical_failure", "downtimeDays": 1, ... }] }
```

### PUT /api/loom-downtimes/:id

```bash
# End ongoing downtime
curl -s -X PUT "$BASE_URL/loom-downtimes/$DOWNTIME_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"endDate": "2026-02-16"}'
# → 200 { "endDate": "2026-02-16", "downtimeDays": 2 }
```

---

## 23. Shifts (Phase 5)

### POST /api/shifts

```bash
# Create shift (only when shiftEnabled=true)
curl -s -X POST "$BASE_URL/shifts" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Morning Shift",
    "startTime": "06:00",
    "endTime": "14:00"
  }'
# → 201 { "id": "uuid", "name": "Morning Shift", "startTime": "06:00", "endTime": "14:00" }

# Error: shift disabled
# → 400 { "error": { "code": "FEATURE_DISABLED", "message": "Shift tracking is not enabled" } }
```

### GET /api/shifts

```bash
curl -s "$BASE_URL/shifts" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "name": "Morning Shift", ... }] }
```

### PUT /api/shifts/:id

```bash
curl -s -X PUT "$BASE_URL/shifts/$SHIFT_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Morning Shift (Extended)", "endTime": "15:00"}'
# → 200 { "id": "uuid", "name": "Morning Shift (Extended)", "endTime": "15:00" }
```

---

## 24. Performance & Ranking (Phase 5)

### GET /api/wagers/:id/performance

```bash
# Individual wager performance
curl -s "$BASE_URL/wagers/$WAGER_ID/performance?period=weekly" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "wagerId": "uuid", "wagerName": "Murugan K",
#   "period": "2026-02-10 to 2026-02-16",
#   "actualProduction": 85,
#   "capacity": 96,
#   "downtimeDays": 1,
#   "adjustedCapacity": 84,
#   "utilizationPct": "101.19",
#   "totalWeightKg": "170.50"
# }
```

### GET /api/wagers/ranking

```bash
# All wager ranking (owner/staff view)
curl -s "$BASE_URL/wagers/ranking?period=weekly" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "data": [
#     { "rank": 1, "wagerId": "uuid", "name": "Murugan K", "utilizationPct": "101.19" },
#     { "rank": 2, "wagerId": "uuid", "name": "Selvam R", "utilizationPct": "95.50" }
#   ]
# }

# Wager view when ranking hidden
curl -s "$BASE_URL/wagers/ranking" \
  -H "Authorization: Bearer $WAGER_TOKEN"
# → 403 (when showWagerRanking=false)
# → 200 (when showWagerRanking=true)
```

---

## 25. Damage Records (Phase 6)

### POST /api/damage-records

```bash
# Record damage
curl -s -X POST "$BASE_URL/damage-records" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productionReturnId": "'$RETURN_ID'",
    "wagerId": "'$WAGER_ID'",
    "productId": "'$PRODUCT_ID'",
    "color": "White",
    "detectionPoint": "after_weaving",
    "grade": "minor",
    "damagedCount": 3,
    "notes": "Slight thread irregularity"
  }'
# → 201 {
#   "id": "uuid", "status": "pending",
#   "grade": "minor", "damagedCount": 3,
#   "deductionRatePct": "25.00",
#   "productionCostPerPiece": "55.00",
#   "totalDeduction": "41.25"
# }

# Miscellaneous damage (no wager link)
curl -s -X POST "$BASE_URL/damage-records" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'$PRODUCT_ID'",
    "color": "White",
    "detectionPoint": "during_packaging",
    "grade": "major",
    "damagedCount": 2,
    "isMiscellaneous": true,
    "notes": "Cannot identify source wager"
  }'
# → 201 { "isMiscellaneous": true, "wagerId": null, ... }
```

### GET /api/damage-records

```bash
# List damage records (with filters)
curl -s "$BASE_URL/damage-records?wagerId=$WAGER_ID&status=pending&grade=minor" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "grade": "minor", "status": "pending", ... }] }

# Wager sees only own records
curl -s "$BASE_URL/damage-records" \
  -H "Authorization: Bearer $WAGER_TOKEN"
# → 200 { "data": [... only own damage records ...] }
```

### GET /api/damage-records/:id

```bash
curl -s "$BASE_URL/damage-records/$DAMAGE_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "id": "uuid", "grade": "minor", "deductionRatePct": "25.00", "totalDeduction": "41.25", ... }
```

### PUT /api/damage-records/:id/approve

```bash
# Owner approves damage (deduction ready for wage cycle)
curl -s -X PUT "$BASE_URL/damage-records/$DAMAGE_ID/approve" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "id": "uuid", "status": "approved", "approvedBy": "uuid", "approvedAt": "2026-02-15T..." }

# Error: non-owner trying to approve
curl -s -X PUT "$BASE_URL/damage-records/$DAMAGE_ID/approve" \
  -H "Authorization: Bearer $STAFF_TOKEN"
# → 403 { "error": { "code": "FORBIDDEN", "message": "Only owner can approve damage" } }

# Error: already approved
# → 400 { "error": { "code": "INVALID_STATUS", "message": "Damage record already approved" } }
```

### PUT /api/damage-records/:id/reject

```bash
# Owner rejects damage (no deduction applied)
curl -s -X PUT "$BASE_URL/damage-records/$DAMAGE_ID/reject" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "id": "uuid", "status": "rejected" }
```

---

## 26. Tailoring Records (Phase 7)

### POST /api/tailoring-records

```bash
# Record tailoring work
curl -s -X POST "$BASE_URL/tailoring-records" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tailorId": "'$TAILOR_USER_ID'",
    "productId": "'$PRODUCT_ID'",
    "color": "White",
    "godownId": "'$GODOWN_ID'",
    "stitchCount": 40,
    "knotCount": 40,
    "batchId": "'$BATCH_ID'"
  }'
# → 201 {
#   "id": "uuid", "tailorId": "uuid",
#   "stitchCount": 40, "knotCount": 40,
#   "stitchWage": "120.00", "knotWage": "80.00", "totalWage": "200.00",
#   "inventoryTransition": { "from": "woven", "to": "tailored", "quantity": 40 }
# }

# Error: insufficient woven stock
curl -s -X POST "$BASE_URL/tailoring-records" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tailorId": "'$TAILOR_USER_ID'", "productId": "'$PRODUCT_ID'", "color": "White", "godownId": "'$GODOWN_ID'", "stitchCount": 9999}'
# → 400 { "error": { "code": "INSUFFICIENT_STOCK", "message": "Not enough woven stock" } }

# Tailor self-service: own records
curl -s "$BASE_URL/tailoring-records" \
  -H "Authorization: Bearer $TAILOR_TOKEN"
# → 200 { "data": [... only own tailoring records ...] }
```

### GET /api/tailoring-records

```bash
curl -s "$BASE_URL/tailoring-records?tailorId=$TAILOR_USER_ID&dateFrom=2026-02-10" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "stitchCount": 40, "totalWage": "200.00", ... }] }
```

---

## 27. Packaging Records (Phase 7)

### POST /api/packaging-records

```bash
# Record packaging work
curl -s -X POST "$BASE_URL/packaging-records" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "packagerId": "'$PACKAGER_USER_ID'",
    "productId": "'$PRODUCT_ID'",
    "color": "White",
    "godownId": "'$GODOWN_ID'",
    "bundleType": "small",
    "bundleCount": 10,
    "batchId": "'$BATCH_ID'"
  }'
# → 201 {
#   "id": "uuid", "packagerId": "uuid",
#   "bundleType": "small", "bundleCount": 10,
#   "piecesPerBundle": 6, "totalPieces": 60,
#   "wagePerBundle": "5.00", "totalWage": "50.00",
#   "inventoryTransition": { "from": "tailored", "to": "bundled", "quantity": 60 }
# }

# Error: insufficient tailored stock
# → 400 { "error": { "code": "INSUFFICIENT_STOCK", "message": "Not enough tailored stock" } }

# Packager self-service
curl -s "$BASE_URL/packaging-records" \
  -H "Authorization: Bearer $PACKAGER_TOKEN"
# → 200 { "data": [... only own packaging records ...] }
```

### GET /api/packaging-records

```bash
curl -s "$BASE_URL/packaging-records?packagerId=$PACKAGER_USER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "bundleCount": 10, "totalWage": "50.00", ... }] }
```

---

## 28. Advances (Phase 8)

### POST /api/advances

```bash
# Issue advance to wager
curl -s -X POST "$BASE_URL/advances" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wagerId": "'$WAGER_ID'",
    "amount": "5000.00",
    "notes": "Initial advance for February 2026"
  }'
# → 201 {
#   "id": "uuid", "type": "advance_given",
#   "amount": "5000.00", "balanceAfter": "5000.00"
# }
```

### GET /api/advances

```bash
# List advance transactions
curl -s "$BASE_URL/advances?wagerId=$WAGER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [
#   { "type": "advance_given", "amount": "5000.00", "balanceAfter": "5000.00", "createdAt": "..." },
#   { "type": "advance_deduction", "amount": "1000.00", "balanceAfter": "4000.00", "createdAt": "..." }
# ] }
```

### GET /api/wagers/:id/advance-balance

```bash
# Get current advance balance
curl -s "$BASE_URL/wagers/$WAGER_ID/advance-balance" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "wagerId": "uuid", "advanceBalance": "4000.00", "originalAdvance": "5000.00" }

# Wager self-service
curl -s "$BASE_URL/wagers/me/advance-balance" \
  -H "Authorization: Bearer $WAGER_TOKEN"
# → 200 { "advanceBalance": "4000.00" }
```

---

## 29. Wage Cycles (Phase 8)

### POST /api/wage-cycles/generate

```bash
# Auto-generate current wage cycle
curl -s -X POST "$BASE_URL/wage-cycles/generate" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cycleStartDate": "2026-02-09",
    "cycleEndDate": "2026-02-15"
  }'
# → 201 {
#   "id": "uuid", "status": "draft",
#   "cycleStartDate": "2026-02-09", "cycleEndDate": "2026-02-15",
#   "wageRecords": [
#     {
#       "workerId": "uuid", "workerName": "Murugan K", "workerType": "wager",
#       "grossWage": "4500.00",
#       "advanceDeduction": "1000.00",
#       "damageDeduction": "82.50",
#       "netPayable": "3417.50"
#     },
#     {
#       "workerId": "uuid", "workerName": "Lakshmi S", "workerType": "tailor",
#       "grossWage": "2400.00",
#       "advanceDeduction": "0.00",
#       "damageDeduction": "0.00",
#       "netPayable": "2400.00"
#     }
#   ],
#   "totalGross": "12500.00",
#   "totalDeductions": "2082.50",
#   "totalNetPayable": "10417.50"
# }
```

### GET /api/wage-cycles

```bash
curl -s "$BASE_URL/wage-cycles?status=draft" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "status": "draft", "cycleStartDate": "...", ... }] }
```

### GET /api/wage-cycles/:id

```bash
# Get cycle with all wage records
curl -s "$BASE_URL/wage-cycles/$CYCLE_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "id": "uuid", "status": "draft",
#   "wageRecords": [
#     {
#       "workerType": "wager", "workerName": "Murugan K",
#       "grossWage": "4500.00",
#       "advanceDeduction": "1000.00",
#       "damageDeduction": "82.50",
#       "netPayable": "3417.50",
#       "discretionaryAmount": "0.00",
#       "actualPaid": "0.00",
#       "breakdown": {
#         "productionReturns": [{ "date": "...", "weightKg": "12.50", "amount": "562.50" }],
#         "damageRecords": [{ "grade": "minor", "count": 3, "deduction": "82.50" }]
#       }
#     }
#   ]
# }
```

### PUT /api/wage-cycles/:id/review

```bash
# Move to review status
curl -s -X PUT "$BASE_URL/wage-cycles/$CYCLE_ID/review" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "id": "uuid", "status": "review" }
```

### PUT /api/wage-cycles/:id/approve

```bash
# Approve cycle
curl -s -X PUT "$BASE_URL/wage-cycles/$CYCLE_ID/approve" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "id": "uuid", "status": "approved" }

# Error: invalid transition (draft → approved directly)
# → 400 { "error": { "code": "INVALID_TRANSITION", "message": "Must review before approving" } }
```

### PUT /api/wage-cycles/:id/pay

```bash
# Mark as paid (with optional discretionary payments)
curl -s -X PUT "$BASE_URL/wage-cycles/$CYCLE_ID/pay" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payments": [
      { "wageRecordId": "'$RECORD_ID'", "discretionaryAmount": "0.00" },
      { "wageRecordId": "'$RECORD_ID_2'", "discretionaryAmount": "500.00" }
    ]
  }'
# → 200 {
#   "id": "uuid", "status": "paid",
#   "wageRecords": [
#     { "workerName": "Murugan K", "netPayable": "3417.50", "actualPaid": "3417.50" },
#     { "workerName": "Ravi P", "netPayable": "-200.00", "discretionaryAmount": "500.00", "actualPaid": "500.00" }
#   ]
# }

# Note: Ravi P's negative balance means discretionary goes to advance:
# advance_balance increases by 500.00
```

### GET /api/wagers/me/wages

```bash
# Wager self-service: own wage history
curl -s "$BASE_URL/wagers/me/wages" \
  -H "Authorization: Bearer $WAGER_TOKEN"
# → 200 {
#   "data": [
#     {
#       "cycleId": "uuid", "period": "Feb 9-15, 2026",
#       "grossWage": "4500.00", "advanceDeduction": "1000.00",
#       "damageDeduction": "82.50", "netPayable": "3417.50", "status": "paid"
#     }
#   ]
# }
```

---

## 30. Invoices (Phase 9)

### POST /api/invoices

```bash
# Create invoice with items (GST auto-detection)
curl -s -X POST "$BASE_URL/invoices" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "'$CUSTOMER_ID'",
    "invoiceDate": "2026-02-15",
    "items": [
      {
        "productId": "'$PRODUCT_ID'",
        "color": "White",
        "quantity": 100,
        "unitPrice": "120.00",
        "batchId": "'$BATCH_ID'"
      },
      {
        "productId": "'$PRODUCT_ID'",
        "color": "Blue",
        "quantity": 50,
        "unitPrice": "125.00"
      }
    ]
  }'
# → 201 {
#   "id": "uuid",
#   "invoiceNumber": "INV-2026-0001",
#   "customerId": "uuid",
#   "invoiceDate": "2026-02-15",
#   "dueDate": "2026-04-01",
#   "taxType": "intra_state",
#   "subtotal": "18250.00",
#   "cgst": "456.25",
#   "sgst": "456.25",
#   "igst": "0.00",
#   "totalAmount": "19162.50",
#   "balanceDue": "19162.50",
#   "status": "draft",
#   "items": [
#     { "productName": "Khadi Premium", "color": "White", "quantity": 100, "unitPrice": "120.00", "lineTotal": "12000.00", "gstRatePct": "5.00" },
#     { "productName": "Khadi Premium", "color": "Blue", "quantity": 50, "unitPrice": "125.00", "lineTotal": "6250.00", "gstRatePct": "5.00" }
#   ]
# }

# Inter-state customer → IGST
# (customer.stateCode != tenant.stateCode)
# → { "taxType": "inter_state", "cgst": "0.00", "sgst": "0.00", "igst": "912.50" }
```

### GET /api/invoices

```bash
curl -s "$BASE_URL/invoices?customerId=$CUSTOMER_ID&status=draft&dateFrom=2026-02-01" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "invoiceNumber": "INV-2026-0001", "totalAmount": "19162.50", ... }] }
```

### GET /api/invoices/:id

```bash
curl -s "$BASE_URL/invoices/$INVOICE_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "id": "uuid", "invoiceNumber": "INV-2026-0001", "items": [...], ... }
```

### PUT /api/invoices/:id

```bash
# Update draft invoice
curl -s -X PUT "$BASE_URL/invoices/$INVOICE_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": "'$PRODUCT_ID'", "color": "White", "quantity": 120, "unitPrice": "118.00"}]}'
# → 200 { "subtotal": "14160.00", ... }
```

### PUT /api/invoices/:id/issue

```bash
# Issue invoice (draft → issued, inventory → sold)
curl -s -X PUT "$BASE_URL/invoices/$INVOICE_ID/issue" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "id": "uuid", "status": "issued",
#   "inventoryTransitions": [
#     { "productId": "uuid", "color": "White", "stage": "bundled → sold", "quantity": 100 }
#   ]
# }
```

### PUT /api/invoices/:id/cancel

```bash
# Cancel invoice
curl -s -X PUT "$BASE_URL/invoices/$INVOICE_ID/cancel" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "id": "uuid", "status": "cancelled" }
```

### GET /api/invoices/:id/eway-bill

```bash
# E-way bill JSON export
curl -s "$BASE_URL/invoices/$INVOICE_ID/eway-bill" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "supplyType": "O",
#   "subSupplyType": "1",
#   "docType": "INV",
#   "docNo": "INV-2026-0001",
#   "docDate": "15/02/2026",
#   "fromGstin": "33AABCT1234F1Z5",
#   "toGstin": "33AABCC1234H1Z2",
#   "totalValue": "19162.50",
#   "items": [...]
# }
```

---

## 31. Payments (Phase 9)

### POST /api/payments

```bash
# Record partial payment
curl -s -X POST "$BASE_URL/payments" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "'$INVOICE_ID'",
    "customerId": "'$CUSTOMER_ID'",
    "amount": "10000.00",
    "paymentMethod": "upi",
    "paymentDate": "2026-02-20",
    "referenceNumber": "UPI-REF-123"
  }'
# → 201 {
#   "id": "uuid", "amount": "10000.00",
#   "invoiceBalanceDue": "9162.50",
#   "customerOutstandingBalance": "9162.50"
# }

# Full payment → invoice paid
curl -s -X POST "$BASE_URL/payments" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": "'$INVOICE_ID'", "customerId": "'$CUSTOMER_ID'", "amount": "9162.50", "paymentMethod": "bank_transfer", "paymentDate": "2026-03-01"}'
# → 201 { "invoiceBalanceDue": "0.00", "invoiceStatus": "paid" }

# Error: payment > balance_due
curl -s -X POST "$BASE_URL/payments" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": "'$INVOICE_ID'", "customerId": "'$CUSTOMER_ID'", "amount": "999999.00", "paymentMethod": "cash"}'
# → 400 { "error": { "code": "OVERPAYMENT", "message": "Payment exceeds invoice balance" } }

# Error: bill-to-bill customer partial payment
curl -s -X POST "$BASE_URL/payments" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": "'$BTB_INVOICE_ID'", "customerId": "'$BTB_CUSTOMER_ID'", "amount": "5000.00", "paymentMethod": "cash"}'
# → 400 { "error": { "code": "PARTIAL_NOT_ALLOWED", "message": "Bill-to-bill customers must pay full invoice amount" } }
```

### GET /api/payments

```bash
curl -s "$BASE_URL/payments?customerId=$CUSTOMER_ID&dateFrom=2026-02-01" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "id": "uuid", "amount": "10000.00", "paymentMethod": "upi", ... }] }
```

### GET /api/customers/:id/statement

```bash
# Customer account statement
curl -s "$BASE_URL/customers/$CUSTOMER_ID/statement?dateFrom=2026-01-01&dateTo=2026-02-28" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "customer": { "name": "Chennai Wholesale Traders", "outstandingBalance": "9162.50" },
#   "entries": [
#     { "date": "2026-02-15", "type": "invoice", "ref": "INV-2026-0001", "debit": "19162.50", "credit": "0.00", "balance": "19162.50" },
#     { "date": "2026-02-20", "type": "payment", "ref": "UPI-REF-123", "debit": "0.00", "credit": "10000.00", "balance": "9162.50" }
#   ]
# }
```

---

## 32. Notifications (Phase 10)

### GET /api/notifications

```bash
# List notifications (current user only)
curl -s "$BASE_URL/notifications?isRead=false&limit=20" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "data": [
#     { "id": "uuid", "type": "credit_overdue", "title": "Payment overdue", "message": "INV-2026-0001 is 5 days overdue", "priority": "high", "isRead": false, "createdAt": "..." },
#     { "id": "uuid", "type": "wage_cycle_ready", "title": "Wage cycle ready", "message": "Weekly cycle Feb 9-15 ready for review", "priority": "medium", "isRead": false }
#   ]
# }
```

### GET /api/notifications/unread-count

```bash
curl -s "$BASE_URL/notifications/unread-count" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "count": 7 }
```

### PUT /api/notifications/:id/read

```bash
# Mark single notification as read
curl -s -X PUT "$BASE_URL/notifications/$NOTIFICATION_ID/read" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "id": "uuid", "isRead": true, "readAt": "2026-02-15T..." }
```

### PUT /api/notifications/read-all

```bash
# Mark all as read
curl -s -X PUT "$BASE_URL/notifications/read-all" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "updatedCount": 7 }
```

---

## 33. Fraud Alerts (Phase 10)

### GET /api/fraud-alerts

```bash
# List fraud alerts (owner + authorized staff only)
curl -s "$BASE_URL/fraud-alerts?isResolved=false" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "data": [
#     {
#       "id": "uuid", "alertType": "color_substitution",
#       "description": "Wager Murugan K returned Blue color but was issued White",
#       "severity": "high", "isResolved": false,
#       "relatedEntity": { "type": "production_return", "id": "uuid" },
#       "createdAt": "..."
#     }
#   ]
# }

# Error: wager/tailor/packager access
curl -s "$BASE_URL/fraud-alerts" \
  -H "Authorization: Bearer $WAGER_TOKEN"
# → 403 { "error": { "code": "FORBIDDEN", "message": "Insufficient permissions" } }
```

### PUT /api/fraud-alerts/:id/resolve

```bash
curl -s -X PUT "$BASE_URL/fraud-alerts/$ALERT_ID/resolve" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolution": "Verified with wager. Color was correct, labeling error."}'
# → 200 { "id": "uuid", "isResolved": true, "resolvedBy": "uuid", "resolvedAt": "..." }
```

---

## 34. Reports (Phase 11)

### Production Reports

```bash
# Production summary (daily/weekly/monthly)
curl -s "$BASE_URL/reports/production-summary?period=weekly&dateFrom=2026-02-09&dateTo=2026-02-15" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "period": "weekly", "dateRange": "Feb 9-15, 2026",
#   "totalPieces": 850, "totalWeightKg": "1700.00",
#   "byProduct": [{ "productName": "Khadi Premium", "pieces": 500, "weightKg": "1000.00" }],
#   "byColor": [{ "color": "White", "pieces": 600 }, { "color": "Blue", "pieces": 250 }]
# }

# Batch profitability (when batchEnabled)
curl -s "$BASE_URL/reports/batch-profitability?batchId=$BATCH_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "batchNumber": "B-2026-001",
#   "materialCost": "30000.00", "wageCost": "8500.00", "totalCost": "38500.00",
#   "revenue": "60000.00", "profit": "21500.00", "marginPct": "35.83"
# }

# Color profitability
curl -s "$BASE_URL/reports/color-profitability?dateFrom=2026-01-01&dateTo=2026-02-28" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "color": "White", "revenue": "120000.00", "cost": "78000.00", "profit": "42000.00" }] }

# Product profitability
curl -s "$BASE_URL/reports/product-profitability?dateFrom=2026-01-01" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "productName": "Khadi Premium", "revenue": "...", "cost": "...", "profit": "..." }] }
```

### Wager Reports

```bash
# Weekly wage sheet
curl -s "$BASE_URL/reports/wage-sheet/$CYCLE_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "cyclePeriod": "Feb 9-15, 2026",
#   "workers": [
#     { "name": "Murugan K", "type": "wager", "gross": "4500.00", "advance": "1000.00", "damage": "82.50", "net": "3417.50" },
#     { "name": "Lakshmi S", "type": "tailor", "gross": "2400.00", "advance": "0.00", "damage": "0.00", "net": "2400.00" }
#   ],
#   "totals": { "gross": "12500.00", "advance": "2000.00", "damage": "82.50", "net": "10417.50" }
# }

# Wager damage percentage
curl -s "$BASE_URL/reports/wager-damage?dateFrom=2026-02-01" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "wagerName": "Murugan K", "totalReturned": 200, "totalDamaged": 6, "damagePct": "3.00" }] }

# Capacity utilization
curl -s "$BASE_URL/reports/wager-utilization?period=monthly" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "wagerName": "Murugan K", "utilizationPct": "95.50", "adjustedForDowntime": true }] }

# Wager advance balances
curl -s "$BASE_URL/reports/wager-advance" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "wagerName": "Murugan K", "advanceBalance": "4000.00", "originalAdvance": "5000.00" }] }

# Wager ranking
curl -s "$BASE_URL/reports/wager-ranking?period=monthly" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "rank": 1, "wagerName": "Murugan K", "utilizationPct": "95.50", "damagePct": "3.00" }] }
```

### Inventory Reports

```bash
# Cone stock by color/godown
curl -s "$BASE_URL/reports/cone-stock" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "godownName": "Main Godown", "color": "White", "weightKg": "480.00" }] }

# Paavu stock
curl -s "$BASE_URL/reports/paavu-stock" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "godownName": "Paavu Pattarai", "productName": "...", "paavuCount": 180 }] }

# Finished stock by stage
curl -s "$BASE_URL/reports/finished-stock" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "data": [
#     { "stage": "woven", "totalPieces": 230, "totalKg": "345.00" },
#     { "stage": "tailored", "totalPieces": 180 },
#     { "stage": "bundled", "totalBundles": 25, "totalPieces": 150 }
#   ]
# }

# Stock movement history
curl -s "$BASE_URL/reports/stock-movement?dateFrom=2026-02-01&productId=$PRODUCT_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "date": "2026-02-15", "type": "in", "stage": "raw_cone", "quantity": "120.00", "source": "Cone Purchase" }] }
```

### Finance Reports

```bash
# GST summary
curl -s "$BASE_URL/reports/gst-summary?dateFrom=2026-01-01&dateTo=2026-03-31" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "totalCgst": "15230.00", "totalSgst": "15230.00", "totalIgst": "8450.00",
#   "byMonth": [
#     { "month": "2026-01", "cgst": "5200.00", "sgst": "5200.00", "igst": "2800.00" },
#     { "month": "2026-02", "cgst": "10030.00", "sgst": "10030.00", "igst": "5650.00" }
#   ]
# }

# Customer aging report
curl -s "$BASE_URL/reports/customer-aging" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "summary": {
#     "current": "50000.00", "days30": "25000.00",
#     "days60": "10000.00", "days90Plus": "5000.00",
#     "total": "90000.00"
#   },
#   "customers": [
#     {
#       "name": "Chennai Wholesale", "total": "45000.00",
#       "current": "25000.00", "days30": "15000.00", "days60": "5000.00", "days90Plus": "0.00"
#     }
#   ]
# }

# Supplier ledger
curl -s "$BASE_URL/reports/supplier-ledger?dateFrom=2026-01-01" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "supplierName": "KG Yarns", "totalPurchases": "180000.00", "totalGst": "9000.00" }] }

# Revenue summary
curl -s "$BASE_URL/reports/revenue?period=monthly&dateFrom=2026-01-01" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "data": [
#     { "period": "2026-01", "invoiceCount": 12, "totalRevenue": "250000.00", "totalTax": "12500.00" },
#     { "period": "2026-02", "invoiceCount": 8, "totalRevenue": "185000.00", "totalTax": "9250.00" }
#   ]
# }
```

### Performance Reports

```bash
# Loom utilization per type
curl -s "$BASE_URL/reports/loom-utilization?period=monthly" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 { "data": [{ "loomType": "Power Loom 48 inch", "totalLooms": 10, "avgUtilizationPct": "88.50" }] }

# Downtime report
curl -s "$BASE_URL/reports/downtime?dateFrom=2026-02-01&groupBy=reason" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "data": [
#     { "reason": "mechanical_failure", "totalDays": 12, "affectedLooms": 4 },
#     { "reason": "power_outage", "totalDays": 3, "affectedLooms": 10 }
#   ]
# }

# Shift-wise production (when shiftEnabled)
curl -s "$BASE_URL/reports/shift-production?dateFrom=2026-02-01" \
  -H "Authorization: Bearer $OWNER_TOKEN"
# → 200 {
#   "data": [
#     { "shiftName": "Morning", "totalPieces": 450, "totalWeightKg": "900.00", "wagerCount": 8 },
#     { "shiftName": "Evening", "totalPieces": 380, "totalWeightKg": "760.00", "wagerCount": 6 }
#   ]
# }
```

---

## Tenant Isolation Verification Tests

These tests verify that no tenant can access another tenant's data. Run these after setting up both Tenant A and Tenant B with data.

```bash
# Test 1: Owner A cannot see Owner B's users
curl -s "$BASE_URL/users" \
  -H "Authorization: Bearer $OWNER_A_TOKEN"
# → 200 { "data": [... only Tenant A users ...], "total": N }

curl -s "$BASE_URL/users" \
  -H "Authorization: Bearer $OWNER_B_TOKEN"
# → 200 { "data": [... only Tenant B users ...], "total": M }
# Verify: N != M (different counts), no overlap in IDs

# Test 2: Owner A cannot access Tenant B's specific resource
curl -s "$BASE_URL/products/$TENANT_B_PRODUCT_ID" \
  -H "Authorization: Bearer $OWNER_A_TOKEN"
# → 404 (not visible, not 403)

# Test 3: Owner A cannot access Tenant B's inventory
curl -s "$BASE_URL/inventory?godownId=$TENANT_B_GODOWN_ID" \
  -H "Authorization: Bearer $OWNER_A_TOKEN"
# → 200 { "data": [], "total": 0 } (empty, not error)

# Test 4: Owner A's invoices don't include Tenant B's
curl -s "$BASE_URL/invoices" \
  -H "Authorization: Bearer $OWNER_A_TOKEN"
# → 200 (verify no Tenant B invoice IDs appear)

# Test 5: Super admin can switch tenants via header
curl -s "$BASE_URL/users" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_A_ID"
# → 200 { "data": [... Tenant A users ...] }

curl -s "$BASE_URL/users" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_B_ID"
# → 200 { "data": [... Tenant B users ...] }

# Test 6: Role-based access within tenant
curl -s "$BASE_URL/damage-records" \
  -H "Authorization: Bearer $WAGER_TOKEN"
# → 200 (only wager's own damage records, not all tenant damage records)

curl -s "$BASE_URL/fraud-alerts" \
  -H "Authorization: Bearer $WAGER_TOKEN"
# → 403 (wagers cannot see fraud alerts)

# Test 7: Wage data isolation
curl -s "$BASE_URL/wagers/me/wages" \
  -H "Authorization: Bearer $WAGER_TOKEN"
# → 200 (only own wages)

curl -s "$BASE_URL/wage-cycles" \
  -H "Authorization: Bearer $WAGER_TOKEN"
# → 403 (wagers cannot list all cycles)
```

---

## Common Error Response Shapes

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [{ "field": "fieldName", "message": "Field-level error" }]
  }
}
```

### Standard Error Codes

| HTTP Status | Code                  | When                                              |
| ----------- | --------------------- | ------------------------------------------------- |
| 400         | `VALIDATION_ERROR`    | Request body fails Zod validation                 |
| 400         | `FEATURE_DISABLED`    | Feature flag off (batch, shift, transfer)         |
| 400         | `INVALID_TRANSITION`  | Invalid status change                             |
| 400         | `INSUFFICIENT_STOCK`  | Inventory operation exceeds available stock       |
| 400         | `OVERPAYMENT`         | Payment exceeds invoice balance                   |
| 400         | `PARTIAL_NOT_ALLOWED` | Bill-to-bill customer partial payment             |
| 401         | `UNAUTHORIZED`        | Missing or invalid auth token                     |
| 401         | `INVALID_OTP`         | Wrong OTP code                                    |
| 401         | `OTP_EXPIRED`         | OTP past expiry time                              |
| 401         | `INVALID_PIN`         | Wrong PIN                                         |
| 401         | `TOKEN_EXPIRED`       | JWT expired                                       |
| 403         | `FORBIDDEN`           | Role lacks permission for this action             |
| 404         | `NOT_FOUND`           | Resource doesn't exist or belongs to other tenant |
| 409         | `DUPLICATE`           | Unique constraint violation                       |
| 429         | `RATE_LIMITED`        | Too many requests (OTP send)                      |
| 500         | `INTERNAL_ERROR`      | Server error (details hidden in production)       |

---

## Pagination Convention

All list endpoints support pagination:

```bash
# Standard pagination
curl -s "$BASE_URL/users?limit=20&offset=0" -H "Authorization: Bearer $OWNER_TOKEN"

# Response shape
# {
#   "data": [...],
#   "total": 85,      # Total matching records
#   "limit": 20,      # Page size
#   "offset": 0       # Starting position
# }

# Page 2
curl -s "$BASE_URL/users?limit=20&offset=20" -H "Authorization: Bearer $OWNER_TOKEN"
```

---

## Endpoint Count Summary

| Module               | Endpoints | Methods                         |
| -------------------- | --------- | ------------------------------- |
| Health               | 1         | GET: 1                          |
| Auth                 | 6         | POST: 4, PUT: 1, GET: 1         |
| Tenants              | 5         | POST: 1, GET: 2, PUT: 2         |
| Tenant Settings      | 2         | GET: 1, PUT: 1                  |
| Users                | 5         | POST: 1, GET: 2, PUT: 2         |
| Staff Permissions    | 2         | GET: 1, PUT: 1                  |
| Loom Types           | 3         | POST: 1, GET: 1, PUT: 1         |
| Looms                | 4         | POST: 1, GET: 1, PUT: 2         |
| Products             | 3         | POST: 1, GET: 1, PUT: 1         |
| Product Color Prices | 4         | POST: 1, GET: 1, PUT: 1, DEL: 1 |
| Shift Wage Rates     | 3         | POST: 1, GET: 1, PUT: 1         |
| Suppliers            | 3         | POST: 1, GET: 1, PUT: 1         |
| Customers            | 3         | POST: 1, GET: 1, PUT: 1         |
| Godowns              | 3         | POST: 1, GET: 1, PUT: 1         |
| Wagers               | 4         | GET: 3, PUT: 1                  |
| Batches              | 3         | POST: 1, GET: 1, PUT: 1         |
| Cone Purchases       | 2         | POST: 1, GET: 1                 |
| Inventory            | 3         | GET: 3                          |
| Transfers            | 2         | POST: 1, GET: 1                 |
| Cone Issuances       | 2         | POST: 1, GET: 1                 |
| Paavu Productions    | 2         | POST: 1, GET: 1                 |
| Production Returns   | 2         | POST: 1, GET: 1                 |
| Loom Downtimes       | 3         | POST: 1, GET: 1, PUT: 1         |
| Shifts               | 3         | POST: 1, GET: 1, PUT: 1         |
| Performance          | 2         | GET: 2                          |
| Damage Records       | 5         | POST: 1, GET: 2, PUT: 2         |
| Tailoring Records    | 2         | POST: 1, GET: 1                 |
| Packaging Records    | 2         | POST: 1, GET: 1                 |
| Advances             | 3         | POST: 1, GET: 2                 |
| Wage Cycles          | 7         | POST: 1, GET: 2, PUT: 4         |
| Invoices             | 7         | POST: 1, GET: 3, PUT: 3         |
| Payments             | 3         | POST: 1, GET: 2                 |
| Notifications        | 4         | GET: 2, PUT: 2                  |
| Fraud Alerts         | 2         | GET: 1, PUT: 1                  |
| Reports              | ~18       | GET: ~18                        |
| **Total**            | **~118**  |                                 |
