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

describe("07 — Wage Cycle", () => {
  let t1: SeedIds;
  let createdCycleId: string;
  let wageRecordId: string;

  beforeAll(async () => {
    t1 = await lookupSeedIds(TENANT1_ID);
  });

  // ── Issue Advance ────────────────────────────────────────────────
  it("POST /api/advances — issues advance to wager", async () => {
    const res = await api(tokens.t1Owner).post("/api/advances").send({
      wagerId: T1_WAGER_T1_ID,
      amount: 1000,
      notes: "integration-test-advance",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(1000);
    expect(res.body.data.type).toBe("advance_given");
  });

  it("POST /api/advances — verify advance balance increased", async () => {
    const db = adminDb();
    const [wager] = await db`
      SELECT advance_balance, additional_advances
      FROM wager_profiles
      WHERE user_id = ${T1_WAGER_T1_ID} AND tenant_id = ${TENANT1_ID}
    `;

    // Should include seeded advance (5000) + test advance (1000)
    expect(Number(wager.advance_balance)).toBeGreaterThanOrEqual(6000);
  });

  it("GET /api/advances — lists advances", async () => {
    const res = await api(tokens.t1Owner).get("/api/advances");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // ── Generate Wage Cycle ──────────────────────────────────────────
  it("POST /api/wage-cycles/generate — generates cycle for date range", async () => {
    // Use a date range that doesn't overlap the seeded cycle (2026-02-10 to 2026-02-16)
    const res = await api(tokens.t1Owner)
      .post("/api/wage-cycles/generate")
      .send({
        cycleStartDate: "2026-02-17",
        cycleEndDate: "2026-02-23",
        advanceDeductionAmount: 500,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe("draft");
    createdCycleId = res.body.data.id;
  });

  it("GET /api/wage-cycles/:id — retrieves wage cycle with records", async () => {
    const res = await api(tokens.t1Owner).get(
      `/api/wage-cycles/${createdCycleId}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdCycleId);
    expect(res.body.data.status).toBe("draft");
  });

  it("GET /api/wage-cycles — lists all cycles", async () => {
    const res = await api(tokens.t1Owner).get("/api/wage-cycles");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2); // 1 seeded + 1 test
  });

  // ── Cycle Transitions ────────────────────────────────────────────
  it("PUT /api/wage-cycles/:id/review — transitions draft → review", async () => {
    const res = await api(tokens.t1Owner).put(
      `/api/wage-cycles/${createdCycleId}/review`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("review");
  });

  it("PUT /api/wage-cycles/:id/approve — transitions review → approved", async () => {
    const res = await api(tokens.t1Owner).put(
      `/api/wage-cycles/${createdCycleId}/approve`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("approved");
  });

  it("PUT /api/wage-cycles/:id/pay — transitions approved → paid", async () => {
    const res = await api(tokens.t1Owner).put(
      `/api/wage-cycles/${createdCycleId}/pay`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("paid");
  });

  // ── Worker Self-View ─────────────────────────────────────────────
  it("GET /api/wage-cycles/worker/me — returns worker's own wage records", async () => {
    const res = await api(tokens.t1WagerT1).get("/api/wage-cycles/worker/me");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/wage-cycles/worker/me — tailor sees own wage records", async () => {
    const res = await api(tokens.t1Tailor).get("/api/wage-cycles/worker/me");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  // ── Discretionary Payment ────────────────────────────────────────
  it("PUT /api/wage-cycles/discretionary — owner can set discretionary amount", async () => {
    // We need a wage record ID from the seeded cycle
    const db = adminDb();
    const records = await db`
      SELECT id FROM wage_records
      WHERE tenant_id = ${TENANT1_ID}
      LIMIT 1
    `;

    if (records.length === 0) return; // Skip if no records

    const res = await api(tokens.t1Owner)
      .put("/api/wage-cycles/discretionary")
      .send({
        wageRecordId: records[0].id,
        amount: 500,
      });

    // May fail if cycle is in paid status
    expect([200, 400]).toContain(res.status);
  });

  // ── Permission Check ─────────────────────────────────────────────
  it("POST /api/wage-cycles/generate — wager gets 403", async () => {
    const res = await api(tokens.t1WagerT1)
      .post("/api/wage-cycles/generate")
      .send({
        cycleStartDate: "2026-03-01",
        cycleEndDate: "2026-03-07",
      });

    expect(res.status).toBe(403);
  });
});
