import { describe, it, expect, beforeAll } from "vitest";
import {
  api,
  tokens,
  adminDb,
  lookupSeedIds,
  TENANT1_ID,
  TENANT2_ID,
  type SeedIds,
} from "../setup/helpers.js";

describe("09 — Multi-Tenant Isolation", () => {
  let t1: SeedIds;
  let t2: SeedIds;

  beforeAll(async () => {
    t1 = await lookupSeedIds(TENANT1_ID);
    t2 = await lookupSeedIds(TENANT2_ID);
  });

  // ── T2 sees only T2 data ─────────────────────────────────────────
  it("GET /api/products — T2 owner sees only T2 products", async () => {
    const res = await api(tokens.t2Owner).get("/api/products");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1); // Only Kumar Textiles Khadi
  });

  it("GET /api/godowns — T2 owner sees only T2 godowns", async () => {
    const res = await api(tokens.t2Owner).get("/api/godowns");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2); // Main Warehouse + Paavu Unit
    for (const godown of res.body.data) {
      expect(godown.tenantId).toBe(TENANT2_ID);
    }
  });

  it("GET /api/wagers — T2 owner sees only T2 wagers", async () => {
    const res = await api(tokens.t2Owner).get("/api/wagers");

    expect(res.status).toBe(200);
    for (const wager of res.body.data) {
      expect(wager.tenantId).toBe(TENANT2_ID);
    }
  });

  it("GET /api/customers — T2 owner sees only T2 customers", async () => {
    const res = await api(tokens.t2Owner).get("/api/customers");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1); // Mysore Traders only
  });

  it("GET /api/inventory — T2 owner sees only T2 inventory", async () => {
    const res = await api(tokens.t2Owner).get("/api/inventory");

    expect(res.status).toBe(200);
    // T2 has no inventory records seeded, so should be empty or T2-only
    for (const record of res.body.data) {
      expect(record.tenantId).toBe(TENANT2_ID);
    }
  });

  // ── Cross-tenant entity references fail ──────────────────────────
  it("POST /api/cone-purchases — T2 cannot reference T1 godown", async () => {
    const t1GodownId = t1.godowns[0].id;
    const t2ProductId = t2.products[0]?.id;
    const t2SupplierId = t2.suppliers[0]?.id;

    if (!t2ProductId || !t2SupplierId) return; // Skip if T2 has no products/suppliers

    const res = await api(tokens.t2Owner).post("/api/cone-purchases").send({
      supplierId: t2SupplierId,
      godownId: t1GodownId, // T1's godown — should fail
      productId: t2ProductId,
      color: "White",
      quantityKg: 10,
      ratePerKg: 200,
    });

    expect([400, 403, 404]).toContain(res.status);
  });

  it("POST /api/production-returns — T2 cannot reference T1 product", async () => {
    const t1ProductId = t1.products[0].id;
    const t2GodownId = t2.godowns[0]?.id;
    const t2LoomId = t2.looms[0]?.id;

    if (!t2GodownId) return;

    const res = await api(tokens.t2Owner)
      .post("/api/production-returns")
      .send({
        wagerId: "a2222222-2222-2222-2222-333333333333", // T2 wager
        loomId: t2LoomId || "00000000-0000-0000-0000-000000000000",
        godownId: t2GodownId,
        productId: t1ProductId, // T1's product — should fail
        color: "White",
        pieceCount: 10,
      });

    expect([400, 403, 404]).toContain(res.status);
  });

  // ── Super admin X-Tenant-Id scoping ──────────────────────────────
  it("GET /api/tenants/:id — super admin can view any tenant", async () => {
    const res1 = await api(tokens.superAdmin).get(`/api/tenants/${TENANT1_ID}`);
    expect(res1.status).toBe(200);
    expect(res1.body.data.name).toBe("Ravi Textiles");

    const res2 = await api(tokens.superAdmin).get(`/api/tenants/${TENANT2_ID}`);
    expect(res2.status).toBe(200);
    expect(res2.body.data.name).toBe("Kumar Textiles");
  });

  // ── Staff cross-tenant ───────────────────────────────────────────
  it("GET /api/products — T1 staff cannot access T2 data", async () => {
    // T1 staff using T1 token can only see T1 products
    const res = await api(tokens.t1Staff).get("/api/products");

    expect(res.status).toBe(200);
    for (const product of res.body.data) {
      expect(product.tenantId).toBe(TENANT1_ID);
    }
  });

  // ── Tenant GET isolation ─────────────────────────────────────────
  it("GET /api/tenants/:id — T1 owner cannot view T2 tenant details", async () => {
    const res = await api(tokens.t1Owner).get(`/api/tenants/${TENANT2_ID}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/tenants/:id — T2 owner cannot view T1 tenant details", async () => {
    const res = await api(tokens.t2Owner).get(`/api/tenants/${TENANT1_ID}`);
    expect(res.status).toBe(403);
  });
});
