import { describe, it, expect, beforeAll } from "vitest";
import {
  api,
  tokens,
  lookupSeedIds,
  TENANT1_ID,
  TENANT2_ID,
  T1_WAGER_T1_ID,
  T1_WAGER_T2_ID,
  type SeedIds,
} from "../setup/helpers.js";

describe("05 — Production Pipeline", () => {
  let t1: SeedIds;
  let t2: SeedIds;
  let mainGodownId: string;
  let paavuPattaraiId: string;
  let productId: string;
  let loomId: string;

  beforeAll(async () => {
    t1 = await lookupSeedIds(TENANT1_ID);
    t2 = await lookupSeedIds(TENANT2_ID);
    mainGodownId = t1.godowns.find((g) => g.name === "Main Godown")!.id;
    paavuPattaraiId = t1.godowns.find((g) => g.name === "Paavu Pattarai")!.id;
    productId = t1.products.find((p) => p.name === "Khadi")!.id;
    loomId = t1.looms.find((l) => l.loomNumber === "L-001")!.id;
  });

  // ── Paavu Production ─────────────────────────────────────────────
  it("POST /api/paavu-productions — creates paavu production record", async () => {
    const batchId = t1.batches.find((b) => b.status === "in_progress")?.id;

    const res = await api(tokens.t1Owner).post("/api/paavu-productions").send({
      paavuOatiId: T1_WAGER_T1_ID,
      godownId: paavuPattaraiId,
      productId,
      color: "White",
      batchId,
      coneWeightKg: 10,
      paavuCount: 20,
      wastageGrams: 100,
      notes: "integration-test",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.paavuCount).toBe(20);
  });

  it("GET /api/paavu-productions — lists paavu productions", async () => {
    const res = await api(tokens.t1Owner).get("/api/paavu-productions");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // ── Production Returns ───────────────────────────────────────────
  it("POST /api/production-returns — Type 1 wager (weight-based) return", async () => {
    const batchId = t1.batches.find((b) => b.status === "in_progress")?.id;

    const res = await api(tokens.t1Owner).post("/api/production-returns").send({
      wagerId: T1_WAGER_T1_ID,
      loomId,
      godownId: mainGodownId,
      productId,
      color: "White",
      batchId,
      pieceCount: 50,
      weightKg: 12.5,
      wastageKg: 0.3,
      returnDate: "2026-02-17",
      notes: "integration-test-type1",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.weightKg).toBe(12.5);
  });

  it("POST /api/production-returns — Type 2 wager (piece-based) return", async () => {
    const batchId = t1.batches.find((b) => b.status === "in_progress")?.id;

    const res = await api(tokens.t1Owner).post("/api/production-returns").send({
      wagerId: T1_WAGER_T2_ID,
      loomId,
      godownId: mainGodownId,
      productId,
      color: "White",
      batchId,
      pieceCount: 30,
      returnDate: "2026-02-17",
      notes: "integration-test-type2",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.pieceCount).toBe(30);
  });

  it("GET /api/production-returns — lists returns", async () => {
    const res = await api(tokens.t1Owner).get("/api/production-returns");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/production-returns — wager sees only own returns", async () => {
    const res = await api(tokens.t1WagerT1).get("/api/production-returns");

    expect(res.status).toBe(200);
    for (const pr of res.body.data) {
      expect(pr.wagerId).toBe(T1_WAGER_T1_ID);
    }
  });

  // ── Loom Downtime ────────────────────────────────────────────────
  it("POST /api/loom-downtimes — creates downtime record", async () => {
    const res = await api(tokens.t1Owner).post("/api/loom-downtimes").send({
      loomId,
      wagerId: T1_WAGER_T1_ID,
      reason: "mechanical",
      startTime: "2026-02-17T08:00:00Z",
      notes: "integration-test",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.reason).toBe("mechanical");
  });

  it("GET /api/loom-downtimes — lists downtimes", async () => {
    const res = await api(tokens.t1Owner).get("/api/loom-downtimes");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // ── Shifts ───────────────────────────────────────────────────────
  it("GET /api/shifts — lists shifts for shift-enabled tenant", async () => {
    // T2 (Kumar Textiles) has shift_enabled=true
    const res = await api(tokens.t2Owner).get("/api/shifts");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Batch Linkage ────────────────────────────────────────────────
  it("POST /api/production-returns — batch-enabled tenant links to batch", async () => {
    const batchId = t1.batches.find((b) => b.status === "in_progress")?.id;
    expect(batchId).toBeDefined();

    const res = await api(tokens.t1Owner).post("/api/production-returns").send({
      wagerId: T1_WAGER_T1_ID,
      loomId,
      godownId: mainGodownId,
      productId,
      color: "Red",
      batchId,
      pieceCount: 10,
      weightKg: 2.5,
      returnDate: "2026-02-17",
      notes: "integration-test-batch",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.batchId).toBe(batchId);
  });

  // ── Batches ──────────────────────────────────────────────────────
  it("GET /api/batches — lists T1 batches", async () => {
    const res = await api(tokens.t1Owner).get("/api/batches");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3); // 3 seeded batches
  });

  it("POST /api/batches — creates new batch", async () => {
    const res = await api(tokens.t1Owner).post("/api/batches").send({
      productId,
      color: "Blue",
      batchNumber: "B-INT-TEST-001",
      notes: "integration-test",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.batchNumber).toBe("B-INT-TEST-001");
  });
});
