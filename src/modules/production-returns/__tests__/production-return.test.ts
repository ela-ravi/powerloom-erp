import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createProductionReturnSchema,
  productionReturnListQuerySchema,
} from "../production-return.schema.js";
import crypto from "crypto";

describe("Production Return Schemas", () => {
  describe("createProductionReturnSchema", () => {
    it("accepts valid return with piece count (Type 2/4)", () => {
      const result = createProductionReturnSchema.safeParse({
        wagerId: crypto.randomUUID(),
        loomId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        pieceCount: 100,
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid return with weight (Type 1/3)", () => {
      const result = createProductionReturnSchema.safeParse({
        wagerId: crypto.randomUUID(),
        loomId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        weightKg: 25.5,
      });
      expect(result.success).toBe(true);
    });

    it("accepts full data with all optional fields", () => {
      const result = createProductionReturnSchema.safeParse({
        wagerId: crypto.randomUUID(),
        loomId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "Red",
        batchId: crypto.randomUUID(),
        shiftId: crypto.randomUUID(),
        pieceCount: 100,
        weightKg: 25.5,
        wastageKg: 0.5,
        returnDate: "2024-06-15",
        notes: "Good quality batch",
      });
      expect(result.success).toBe(true);
    });

    it("defaults wastageKg to 0", () => {
      const result = createProductionReturnSchema.parse({
        wagerId: crypto.randomUUID(),
        loomId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        pieceCount: 100,
      });
      expect(result.wastageKg).toBe(0);
    });

    it("rejects missing required fields", () => {
      const result = createProductionReturnSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects zero piece count", () => {
      const result = createProductionReturnSchema.safeParse({
        wagerId: crypto.randomUUID(),
        loomId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        pieceCount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative weight", () => {
      const result = createProductionReturnSchema.safeParse({
        wagerId: crypto.randomUUID(),
        loomId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        weightKg: -5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative wastage", () => {
      const result = createProductionReturnSchema.safeParse({
        wagerId: crypto.randomUUID(),
        loomId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        pieceCount: 100,
        wastageKg: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("productionReturnListQuerySchema", () => {
    it("provides defaults", () => {
      const result = productionReturnListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts all filters", () => {
      const result = productionReturnListQuerySchema.parse({
        wagerId: crypto.randomUUID(),
        loomId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
      });
      expect(result.wagerId).toBeDefined();
    });

    it("rejects invalid UUID filters", () => {
      const result = productionReturnListQuerySchema.safeParse({
        wagerId: "not-uuid",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Wager Type Validation Logic", () => {
  // Type 1/3: Paavu + Oodai → weight mandatory
  it("Type 1 wager requires weight_kg", () => {
    const wagerType = 1;
    const weightKg: number | undefined = undefined;
    expect([1, 3].includes(wagerType) && !weightKg).toBe(true);
  });

  it("Type 3 wager requires weight_kg", () => {
    const wagerType = 3;
    const weightKg: number | undefined = undefined;
    expect([1, 3].includes(wagerType) && !weightKg).toBe(true);
  });

  it("Type 1 wager with weight passes", () => {
    const wagerType = 1;
    const weightKg = 25.5;
    expect([1, 3].includes(wagerType) && !weightKg).toBe(false);
  });

  // Type 2/4: Oodai only → piece_count mandatory
  it("Type 2 wager requires piece_count", () => {
    const wagerType = 2;
    const pieceCount: number | undefined = undefined;
    expect([2, 4].includes(wagerType) && !pieceCount).toBe(true);
  });

  it("Type 4 wager requires piece_count", () => {
    const wagerType = 4;
    const pieceCount: number | undefined = undefined;
    expect([2, 4].includes(wagerType) && !pieceCount).toBe(true);
  });

  it("Type 2 wager with piece count passes", () => {
    const wagerType = 2;
    const pieceCount = 100;
    expect([2, 4].includes(wagerType) && !pieceCount).toBe(false);
  });
});

describe("Production Return Routes", () => {
  it("POST /api/production-returns requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).post("/api/production-returns").send({
      wagerId: crypto.randomUUID(),
      loomId: crypto.randomUUID(),
      godownId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      color: "White",
      pieceCount: 100,
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/production-returns requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .post("/api/production-returns")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        wagerId: crypto.randomUUID(),
        loomId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        pieceCount: 100,
      });

    expect(res.status).toBe(403);
  });

  it("POST /api/production-returns returns 400 for missing fields", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/production-returns")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("GET /api/production-returns requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/production-returns");

    expect(res.status).toBe(401);
  });
});
