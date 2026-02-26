import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  api,
  tokens,
  adminDb,
  lookupSeedIds,
  TENANT1_ID,
  TENANT2_ID,
  type SeedIds,
} from "../setup/helpers.js";

describe("03 — Master Data", () => {
  let t1: SeedIds;
  let t2: SeedIds;
  const cleanupIds: { table: string; id: string }[] = [];

  beforeAll(async () => {
    t1 = await lookupSeedIds(TENANT1_ID);
    t2 = await lookupSeedIds(TENANT2_ID);
  });

  afterAll(async () => {
    const db = adminDb();
    for (const { table, id } of cleanupIds) {
      await db`DELETE FROM ${db(table)} WHERE id = ${id}`;
    }
  });

  // ── Products ─────────────────────────────────────────────────────
  it("GET /api/products — lists T1 products", async () => {
    const res = await api(tokens.t1Owner).get("/api/products");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3); // Khadi, Jakkadu, Cotton Towel
  });

  it("POST /api/products — owner creates product", async () => {
    const res = await api(tokens.t1Owner).post("/api/products").send({
      name: "Test Saree",
      size: "50x100",
      category: "double",
      paavuToPieceRatio: 0.5,
      paavuConsumptionGrams: 200,
      oodaiConsumptionGrams: 300,
      wageRatePerKg: 20,
      wageRatePerPiece: 5,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Test Saree");
    cleanupIds.push({ table: "products", id: res.body.data.id });
  });

  it("GET /api/products/:id — retrieves a single product", async () => {
    const productId = t1.products.find((p) => p.name === "Khadi")!.id;
    const res = await api(tokens.t1Owner).get(`/api/products/${productId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Khadi");
  });

  it("GET /api/products — T2 owner sees only T2 products", async () => {
    const res = await api(tokens.t2Owner).get("/api/products");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1); // Kumar Textiles has 1 product
    expect(res.body.data[0].name).toBe("Khadi");
  });

  it("POST /api/products — staff with master_data can create", async () => {
    const res = await api(tokens.t1Staff).post("/api/products").send({
      name: "Staff Product",
      size: "20x40",
      category: "single",
      paavuToPieceRatio: 1,
      paavuConsumptionGrams: 100,
      oodaiConsumptionGrams: 150,
    });

    expect(res.status).toBe(201);
    cleanupIds.push({ table: "products", id: res.body.data.id });
  });

  // ── Godowns ──────────────────────────────────────────────────────
  it("GET /api/godowns — lists T1 godowns", async () => {
    const res = await api(tokens.t1Owner).get("/api/godowns");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3); // Main, Secondary, Paavu Pattarai
  });

  it("POST /api/godowns — creates new godown", async () => {
    const res = await api(tokens.t1Owner)
      .post("/api/godowns")
      .send({ name: "Test Godown", address: "Test Address" });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Test Godown");
    cleanupIds.push({ table: "godowns", id: res.body.data.id });
  });

  // ── Wager Profiles ───────────────────────────────────────────────
  it("GET /api/wagers — owner sees all wager profiles", async () => {
    const res = await api(tokens.t1Owner).get("/api/wagers");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4); // 4 seeded wagers
  });

  it("GET /api/wagers — wager sees only own profile", async () => {
    const res = await api(tokens.t1WagerT1).get("/api/wagers");

    expect(res.status).toBe(200);
    // Wager should see their own profile(s) only
    for (const wager of res.body.data) {
      expect(wager.userId).toBe("a1111111-1111-1111-1111-333333333333");
    }
  });

  // ── Customers ────────────────────────────────────────────────────
  it("GET /api/customers — lists T1 customers", async () => {
    const res = await api(tokens.t1Owner).get("/api/customers");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3); // 3 seeded for T1
  });

  it("POST /api/customers — creates customer with state code", async () => {
    const res = await api(tokens.t1Owner).post("/api/customers").send({
      name: "Test Customer",
      stateCode: "KA",
      customerType: "retail",
      creditPeriodDays: 0,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.stateCode).toBe("KA");
    cleanupIds.push({ table: "customers", id: res.body.data.id });
  });

  // ── Suppliers ────────────────────────────────────────────────────
  it("GET /api/suppliers — lists T1 suppliers", async () => {
    const res = await api(tokens.t1Owner).get("/api/suppliers");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2); // Lakshmi Cotton Mills + Murugan Thread Works
  });

  // ── Staff Permission Check ───────────────────────────────────────
  it("POST /api/godowns — wager gets 403 (no master_data permission)", async () => {
    const res = await api(tokens.t1WagerT1)
      .post("/api/godowns")
      .send({ name: "Wager Godown" });

    expect(res.status).toBe(403);
  });
});
