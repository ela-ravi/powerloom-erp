import { describe, it, expect, afterAll } from "vitest";
import {
  api,
  tokens,
  adminDb,
  TENANT1_ID,
  TENANT2_ID,
} from "../setup/helpers.js";

describe("02 — Tenant Onboarding", () => {
  const createdTenantIds: string[] = [];

  afterAll(async () => {
    // Clean up created tenants
    if (createdTenantIds.length > 0) {
      const db = adminDb();
      for (const id of createdTenantIds) {
        await db`DELETE FROM tenant_settings WHERE tenant_id = ${id}`;
        await db`DELETE FROM tenants WHERE id = ${id}`;
      }
    }
  });

  // ── Create Tenant ────────────────────────────────────────────────
  it("POST /api/tenants — super admin can create tenant", async () => {
    const res = await api(tokens.superAdmin).post("/api/tenants").send({
      name: "Test Textiles",
      ownerName: "Test Owner",
      phone: "+919999999901",
      stateCode: "TN",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe("Test Textiles");
    createdTenantIds.push(res.body.data.id);
  });

  it("POST /api/tenants — owner gets 403", async () => {
    const res = await api(tokens.t1Owner).post("/api/tenants").send({
      name: "Unauthorized Textiles",
      ownerName: "Unauthorized",
      phone: "+919999999902",
      stateCode: "TN",
    });

    expect(res.status).toBe(403);
  });

  // ── List Tenants ─────────────────────────────────────────────────
  it("GET /api/tenants — super admin lists all tenants", async () => {
    const res = await api(tokens.superAdmin).get("/api/tenants");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2); // At least T1 + T2
  });

  it("GET /api/tenants — owner gets 403", async () => {
    const res = await api(tokens.t1Owner).get("/api/tenants");
    expect(res.status).toBe(403);
  });

  // ── Get Tenant ───────────────────────────────────────────────────
  it("GET /api/tenants/:id — owner can get own tenant", async () => {
    const res = await api(tokens.t1Owner).get(`/api/tenants/${TENANT1_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(TENANT1_ID);
    expect(res.body.data.name).toBe("Ravi Textiles");
  });

  it("GET /api/tenants/:id — owner cannot get other tenant", async () => {
    const res = await api(tokens.t1Owner).get(`/api/tenants/${TENANT2_ID}`);
    expect(res.status).toBe(403);
  });

  // ── Settings ─────────────────────────────────────────────────────
  it("GET /api/tenants/:id/settings — owner can read own settings", async () => {
    const res = await api(tokens.t1Owner).get(
      `/api/tenants/${TENANT1_ID}/settings`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.batchEnabled).toBe(true); // Seeded as true for T1
  });

  it("PUT /api/tenants/:id/settings — owner can update own settings", async () => {
    const res = await api(tokens.t1Owner)
      .put(`/api/tenants/${TENANT1_ID}/settings`)
      .send({ showWagerRanking: true });

    expect(res.status).toBe(200);
  });

  it("PUT /api/tenants/:id/settings — cross-tenant update gets 403", async () => {
    const res = await api(tokens.t2Owner)
      .put(`/api/tenants/${TENANT1_ID}/settings`)
      .send({ batchEnabled: false });

    expect(res.status).toBe(403);
  });

  // ── Suspend Tenant ───────────────────────────────────────────────
  it("PUT /api/tenants/:id/status — super admin can suspend", async () => {
    // Create a tenant to suspend (don't mess with seeded tenants)
    const createRes = await api(tokens.superAdmin).post("/api/tenants").send({
      name: "Suspendable Textiles",
      ownerName: "To Suspend",
      phone: "+919999999903",
      stateCode: "TN",
    });

    const tenantId = createRes.body.data.id;
    createdTenantIds.push(tenantId);

    const res = await api(tokens.superAdmin)
      .put(`/api/tenants/${tenantId}/status`)
      .send({ status: "suspended" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("suspended");
  });

  it("PUT /api/tenants/:id/status — owner gets 403", async () => {
    const res = await api(tokens.t1Owner)
      .put(`/api/tenants/${TENANT1_ID}/status`)
      .send({ status: "suspended" });

    expect(res.status).toBe(403);
  });
});
