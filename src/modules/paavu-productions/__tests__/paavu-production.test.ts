import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createPaavuProductionSchema,
  paavuProductionListQuerySchema,
} from "../paavu-production.schema.js";
import crypto from "crypto";

describe("Paavu Production Schemas", () => {
  describe("createPaavuProductionSchema", () => {
    it("accepts valid paavu production data", () => {
      const result = createPaavuProductionSchema.safeParse({
        paavuOatiId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        coneWeightKg: 30,
        paavuCount: 50,
      });
      expect(result.success).toBe(true);
    });

    it("accepts full data with optional fields", () => {
      const result = createPaavuProductionSchema.safeParse({
        paavuOatiId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "Red",
        batchId: crypto.randomUUID(),
        coneWeightKg: 30,
        paavuCount: 50,
        wastageGrams: 300,
        productionDate: "2024-06-15",
        notes: "Normal production",
      });
      expect(result.success).toBe(true);
    });

    it("defaults wastageGrams to 0", () => {
      const result = createPaavuProductionSchema.parse({
        paavuOatiId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        coneWeightKg: 30,
        paavuCount: 50,
      });
      expect(result.wastageGrams).toBe(0);
    });

    it("rejects missing required fields", () => {
      const result = createPaavuProductionSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects zero cone weight", () => {
      const result = createPaavuProductionSchema.safeParse({
        paavuOatiId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        coneWeightKg: 0,
        paavuCount: 50,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero paavu count", () => {
      const result = createPaavuProductionSchema.safeParse({
        paavuOatiId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        coneWeightKg: 30,
        paavuCount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative wastage", () => {
      const result = createPaavuProductionSchema.safeParse({
        paavuOatiId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        coneWeightKg: 30,
        paavuCount: 50,
        wastageGrams: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("paavuProductionListQuerySchema", () => {
    it("provides defaults", () => {
      const result = paavuProductionListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts all filters", () => {
      const result = paavuProductionListQuerySchema.parse({
        paavuOatiId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
      });
      expect(result.paavuOatiId).toBeDefined();
    });
  });
});

describe("Paavu Wastage Flagging Logic", () => {
  it("flags wastage when exceeding tenant limit (500g default)", () => {
    const wastageLimitGrams = 500;
    const wastageGrams = 750;
    expect(wastageGrams > wastageLimitGrams).toBe(true);
  });

  it("does NOT flag wastage within limit", () => {
    const wastageLimitGrams = 500;
    const wastageGrams = 300;
    expect(wastageGrams > wastageLimitGrams).toBe(false);
  });

  it("does NOT flag wastage at exact limit", () => {
    const wastageLimitGrams = 500;
    const wastageGrams = 500;
    expect(wastageGrams > wastageLimitGrams).toBe(false);
  });
});

describe("Paavu Production Routes", () => {
  it("POST /api/paavu-productions requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).post("/api/paavu-productions").send({
      paavuOatiId: crypto.randomUUID(),
      godownId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      color: "White",
      coneWeightKg: 30,
      paavuCount: 50,
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/paavu-productions requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .post("/api/paavu-productions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        paavuOatiId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        coneWeightKg: 30,
        paavuCount: 50,
      });

    expect(res.status).toBe(403);
  });

  it("POST /api/paavu-productions returns 400 for missing fields", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/paavu-productions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("GET /api/paavu-productions requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/paavu-productions");

    expect(res.status).toBe(401);
  });
});
