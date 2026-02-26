import { describe, it, expect, beforeAll } from "vitest";
import {
  api,
  tokens,
  adminDb,
  lookupSeedIds,
  TENANT1_ID,
  type SeedIds,
} from "../setup/helpers.js";

describe("10 — Reports", () => {
  let t1: SeedIds;
  let wageCycleId: string;

  beforeAll(async () => {
    t1 = await lookupSeedIds(TENANT1_ID);

    // Look up the seeded wage cycle ID
    const db = adminDb();
    const [cycle] = await db`
      SELECT id FROM wage_cycles
      WHERE tenant_id = ${TENANT1_ID}
      ORDER BY created_at ASC
      LIMIT 1
    `;
    wageCycleId = cycle?.id;
  });

  // ── Production Reports ───────────────────────────────────────────
  it("GET /api/reports/production-summary — returns production data", async () => {
    const res = await api(tokens.t1Owner).get(
      "/api/reports/production-summary?from=2026-02-01&to=2026-02-28",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/reports/batch-profitability — returns batch data", async () => {
    const res = await api(tokens.t1Owner).get(
      "/api/reports/batch-profitability?from=2026-02-01&to=2026-02-28",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/reports/color-profitability — returns color profitability", async () => {
    const res = await api(tokens.t1Owner).get(
      "/api/reports/color-profitability?from=2026-02-01&to=2026-02-28",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/reports/product-profitability — returns product profitability", async () => {
    const res = await api(tokens.t1Owner).get(
      "/api/reports/product-profitability?from=2026-02-01&to=2026-02-28",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  // ── Wager Reports ────────────────────────────────────────────────
  it("GET /api/reports/wage-sheet/:cycleId — returns wage sheet", async () => {
    if (!wageCycleId) return; // Skip if no seeded cycle

    const res = await api(tokens.t1Owner).get(
      `/api/reports/wage-sheet/${wageCycleId}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/reports/wager-damage — returns damage report", async () => {
    const res = await api(tokens.t1Owner).get(
      "/api/reports/wager-damage?from=2026-02-01&to=2026-02-28",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/reports/wager-advance — returns advance balance report", async () => {
    const res = await api(tokens.t1Owner).get("/api/reports/wager-advance");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  // ── Inventory Reports ────────────────────────────────────────────
  it("GET /api/reports/cone-stock — returns raw material levels", async () => {
    const res = await api(tokens.t1Owner).get("/api/reports/cone-stock");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/reports/finished-stock — returns finished inventory by stage", async () => {
    const res = await api(tokens.t1Owner).get("/api/reports/finished-stock");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/reports/stock-movement — returns stock movement history", async () => {
    const res = await api(tokens.t1Owner).get(
      "/api/reports/stock-movement?from=2026-02-01&to=2026-02-28",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  // ── Finance Reports ──────────────────────────────────────────────
  it("GET /api/reports/gst-summary — returns GST breakdown", async () => {
    const res = await api(tokens.t1Owner).get(
      "/api/reports/gst-summary?from=2026-02-01&to=2026-02-28",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/reports/customer-aging — returns aging buckets", async () => {
    const res = await api(tokens.t1Owner).get("/api/reports/customer-aging");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  // ── Performance Reports ──────────────────────────────────────────
  it("GET /api/reports/downtime — returns downtime report", async () => {
    const res = await api(tokens.t1Owner).get(
      "/api/reports/downtime?from=2026-02-01&to=2026-02-28",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /api/reports/shift-production — returns shift production data", async () => {
    const res = await api(tokens.t1Owner).get(
      "/api/reports/shift-production?from=2026-02-01&to=2026-02-28",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  // ── Access Control ───────────────────────────────────────────────
  it("GET /api/reports/production-summary — wager gets 403", async () => {
    const res = await api(tokens.t1WagerT1).get(
      "/api/reports/production-summary?from=2026-02-01&to=2026-02-28",
    );

    expect(res.status).toBe(403);
  });

  it("GET /api/reports/customer-aging — tailor gets 403", async () => {
    const res = await api(tokens.t1Tailor).get("/api/reports/customer-aging");

    expect(res.status).toBe(403);
  });
});
