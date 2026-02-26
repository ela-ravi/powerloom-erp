import { describe, it, expect, beforeAll } from "vitest";
import {
  api,
  tokens,
  adminDb,
  lookupSeedIds,
  TENANT1_ID,
  T1_WAGER_T1_ID,
  type SeedIds,
} from "../setup/helpers.js";

describe("06 — Damage Management", () => {
  let t1: SeedIds;
  let productId: string;
  let createdDamageId: string;

  beforeAll(async () => {
    t1 = await lookupSeedIds(TENANT1_ID);
    productId = t1.products.find((p) => p.name === "Khadi")!.id;
  });

  // ── Create Damage (Minor) ────────────────────────────────────────
  it("POST /api/damage-records — creates minor grade damage", async () => {
    const res = await api(tokens.t1Owner).post("/api/damage-records").send({
      wagerId: T1_WAGER_T1_ID,
      productId,
      detectionPoint: "loom",
      grade: "minor",
      damageCount: 2,
      productionCostPerPiece: 40,
      notes: "integration-test-minor",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.grade).toBe("minor");
    expect(res.body.data.damageCount).toBe(2);
    createdDamageId = res.body.data.id;
  });

  // ── Create Damage (Major) ────────────────────────────────────────
  it("POST /api/damage-records — creates major grade damage", async () => {
    const res = await api(tokens.t1Owner).post("/api/damage-records").send({
      wagerId: T1_WAGER_T1_ID,
      productId,
      detectionPoint: "tailoring",
      grade: "major",
      damageCount: 1,
      productionCostPerPiece: 40,
      notes: "integration-test-major",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.grade).toBe("major");
  });

  // ── Miscellaneous Damage ─────────────────────────────────────────
  it("POST /api/damage-records — miscellaneous (no wager)", async () => {
    const res = await api(tokens.t1Owner).post("/api/damage-records").send({
      productId,
      detectionPoint: "godown",
      grade: "reject",
      damageCount: 3,
      productionCostPerPiece: 40,
      isMiscellaneous: true,
      notes: "integration-test-misc",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.isMiscellaneous).toBe(true);
  });

  // ── List Damage Records ──────────────────────────────────────────
  it("GET /api/damage-records — lists damage records", async () => {
    const res = await api(tokens.t1Owner).get("/api/damage-records");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4); // 4 seeded + test records
  });

  it("GET /api/damage-records?approvalStatus=pending — filters by status", async () => {
    const res = await api(tokens.t1Owner).get(
      "/api/damage-records?approvalStatus=pending",
    );

    expect(res.status).toBe(200);
    for (const record of res.body.data) {
      expect(record.approvalStatus).toBe("pending");
    }
  });

  // ── Approve Damage ───────────────────────────────────────────────
  it("PUT /api/damage-records/:id/approve — owner approves", async () => {
    const res = await api(tokens.t1Owner).put(
      `/api/damage-records/${createdDamageId}/approve`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.approvalStatus).toBe("approved");
    expect(res.body.data.approvedBy).toBeDefined();
    expect(res.body.data.approvedAt).toBeDefined();
  });

  // ── Cannot Approve Twice ─────────────────────────────────────────
  it("PUT /api/damage-records/:id/approve — already approved returns error", async () => {
    const res = await api(tokens.t1Owner).put(
      `/api/damage-records/${createdDamageId}/approve`,
    );

    expect([400, 409]).toContain(res.status);
  });

  // ── Reject Damage ────────────────────────────────────────────────
  it("PUT /api/damage-records/:id/reject — rejects pending damage", async () => {
    // Create a new damage to reject
    const createRes = await api(tokens.t1Owner)
      .post("/api/damage-records")
      .send({
        wagerId: T1_WAGER_T1_ID,
        productId,
        detectionPoint: "packaging",
        grade: "minor",
        damageCount: 1,
        productionCostPerPiece: 40,
        notes: "integration-test-to-reject",
      });

    const damageId = createRes.body.data.id;

    const res = await api(tokens.t1Owner).put(
      `/api/damage-records/${damageId}/reject`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.approvalStatus).toBe("rejected");
  });

  // ── Wager Cannot Approve ─────────────────────────────────────────
  it("PUT /api/damage-records/:id/approve — wager gets 403", async () => {
    // Find a pending damage to try approving
    const listRes = await api(tokens.t1Owner).get(
      "/api/damage-records?approvalStatus=pending",
    );
    const pendingId = listRes.body.data[0]?.id;
    if (!pendingId) return; // Skip if no pending damage

    const res = await api(tokens.t1WagerT1).put(
      `/api/damage-records/${pendingId}/approve`,
    );

    expect(res.status).toBe(403);
  });

  // ── Wager Sees Only Own ──────────────────────────────────────────
  it("GET /api/damage-records — wager sees only own damage records", async () => {
    const res = await api(tokens.t1WagerT1).get("/api/damage-records");

    expect(res.status).toBe(200);
    for (const record of res.body.data) {
      // Wager should see only records assigned to them
      // (or miscellaneous records, depending on implementation)
      if (!record.isMiscellaneous) {
        expect(record.wagerId).toBe(T1_WAGER_T1_ID);
      }
    }
  });
});
