import supertest from "supertest";
import postgres from "postgres";
import { app } from "../../../src/app.js";
import { generateTokenPair } from "../../../src/shared/jwt.js";
import { UserRole } from "../../../src/types/enums.js";

// ── Fixed IDs from seed files ────────────────────────────────────────
export const TENANT1_ID = "11111111-1111-1111-1111-111111111111"; // Ravi Textiles (TN)
export const TENANT2_ID = "22222222-2222-2222-2222-222222222222"; // Kumar Textiles (KA)

export const SUPER_ADMIN_ID = "a0000000-0000-0000-0000-000000000001";
export const T1_OWNER_ID = "a1111111-1111-1111-1111-111111111111";
export const T1_STAFF_ID = "a1111111-1111-1111-1111-222222222222";
export const T1_WAGER_T1_ID = "a1111111-1111-1111-1111-333333333333"; // Type 1 per-kg
export const T1_WAGER_T2_ID = "a1111111-1111-1111-1111-444444444444"; // Type 2 per-piece
export const T1_WAGER_T3_ID = "a1111111-1111-1111-1111-555555555555"; // Type 3 per-kg
export const T1_WAGER_T4_ID = "a1111111-1111-1111-1111-666666666666"; // Type 4 per-piece
export const T1_TAILOR_ID = "a1111111-1111-1111-1111-777777777777";
export const T1_PACKAGER_ID = "a1111111-1111-1111-1111-888888888888";
export const T2_OWNER_ID = "a2222222-2222-2222-2222-111111111111";
export const T2_WAGER_ID = "a2222222-2222-2222-2222-333333333333";

// ── Token generators ─────────────────────────────────────────────────
function token(userId: string, tenantId: string, role: UserRole): string {
  return generateTokenPair({ userId, tenantId, role }).accessToken;
}

export const tokens = {
  superAdmin: token(SUPER_ADMIN_ID, TENANT1_ID, UserRole.SUPER_ADMIN),
  t1Owner: token(T1_OWNER_ID, TENANT1_ID, UserRole.OWNER),
  t1Staff: token(T1_STAFF_ID, TENANT1_ID, UserRole.STAFF),
  t1WagerT1: token(T1_WAGER_T1_ID, TENANT1_ID, UserRole.WAGER),
  t1WagerT2: token(T1_WAGER_T2_ID, TENANT1_ID, UserRole.WAGER),
  t1WagerT3: token(T1_WAGER_T3_ID, TENANT1_ID, UserRole.WAGER),
  t1WagerT4: token(T1_WAGER_T4_ID, TENANT1_ID, UserRole.WAGER),
  t1Tailor: token(T1_TAILOR_ID, TENANT1_ID, UserRole.TAILOR),
  t1Packager: token(T1_PACKAGER_ID, TENANT1_ID, UserRole.PACKAGER),
  t2Owner: token(T2_OWNER_ID, TENANT2_ID, UserRole.OWNER),
  t2Wager: token(T2_WAGER_ID, TENANT2_ID, UserRole.WAGER),
};

// ── Supertest wrapper ────────────────────────────────────────────────
export function api(tok?: string) {
  const agent = supertest(app);
  if (tok) {
    // Return a wrapper that sets the auth header on every request
    return {
      get: (url: string) =>
        agent.get(url).set("Authorization", `Bearer ${tok}`),
      post: (url: string) =>
        agent.post(url).set("Authorization", `Bearer ${tok}`),
      put: (url: string) =>
        agent.put(url).set("Authorization", `Bearer ${tok}`),
      delete: (url: string) =>
        agent.delete(url).set("Authorization", `Bearer ${tok}`),
      patch: (url: string) =>
        agent.patch(url).set("Authorization", `Bearer ${tok}`),
    };
  }
  return agent;
}

// ── Direct DB connection for assertions ──────────────────────────────
let _adminDb: postgres.Sql | null = null;

export function adminDb(): postgres.Sql {
  if (!_adminDb) {
    const connectionString =
      process.env.DATABASE_URL_TEST ||
      "postgres://powerloom:powerloom@localhost:5433/powerloom_erp_test";
    _adminDb = postgres(connectionString, { max: 2, idle_timeout: 20 });
  }
  return _adminDb;
}

export async function closeAdminDb() {
  if (_adminDb) {
    await _adminDb.end();
    _adminDb = null;
  }
}

// ── Dynamic entity lookup ────────────────────────────────────────────
export interface SeedIds {
  products: Array<{ id: string; name: string; size: string }>;
  godowns: Array<{ id: string; name: string; godownType: string }>;
  looms: Array<{ id: string; loomNumber: string }>;
  loomTypes: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  customers: Array<{
    id: string;
    name: string;
    stateCode: string;
    customerType: string;
  }>;
  batches: Array<{ id: string; batchNumber: string; status: string }>;
  shifts: Array<{ id: string; name: string }>;
}

export async function lookupSeedIds(tenantId: string): Promise<SeedIds> {
  const db = adminDb();
  const [
    products,
    godowns,
    looms,
    loomTypes,
    suppliers,
    customers,
    batches,
    shifts,
  ] = await Promise.all([
    db`SELECT id, name, size FROM products WHERE tenant_id = ${tenantId} ORDER BY name`,
    db`SELECT id, name, godown_type as "godownType" FROM godowns WHERE tenant_id = ${tenantId} ORDER BY name`,
    db`SELECT id, loom_number as "loomNumber" FROM looms WHERE tenant_id = ${tenantId} ORDER BY loom_number`,
    db`SELECT id, name FROM loom_types WHERE tenant_id = ${tenantId} ORDER BY name`,
    db`SELECT id, name FROM suppliers WHERE tenant_id = ${tenantId} ORDER BY name`,
    db`SELECT id, name, state_code as "stateCode", customer_type as "customerType" FROM customers WHERE tenant_id = ${tenantId} ORDER BY name`,
    db`SELECT id, batch_number as "batchNumber", status FROM batches WHERE tenant_id = ${tenantId} ORDER BY batch_number`,
    db`SELECT id, name FROM shifts WHERE tenant_id = ${tenantId} ORDER BY name`,
  ]);
  return {
    products: products as SeedIds["products"],
    godowns: godowns as SeedIds["godowns"],
    looms: looms as SeedIds["looms"],
    loomTypes: loomTypes as SeedIds["loomTypes"],
    suppliers: suppliers as SeedIds["suppliers"],
    customers: customers as SeedIds["customers"],
    batches: batches as SeedIds["batches"],
    shifts: shifts as SeedIds["shifts"],
  };
}
