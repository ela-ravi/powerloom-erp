import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createConeIssuanceSchema,
  coneIssuanceListQuerySchema,
} from "../cone-issuance.schema.js";
import crypto from "crypto";

describe("Cone Issuance Schemas", () => {
  describe("createConeIssuanceSchema", () => {
    it("accepts valid cone issuance data with items", () => {
      const result = createConeIssuanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),

        items: [{ color: "White", quantityKg: 50 }],
      });
      expect(result.success).toBe(true);
    });

    it("accepts multiple items", () => {
      const result = createConeIssuanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),

        items: [
          { color: "White", quantityKg: 30 },
          { color: "Red", quantityKg: 20, batchId: crypto.randomUUID() },
        ],
        notes: "Multi-color issuance",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(2);
      }
    });

    it("accepts full data with optional fields", () => {
      const result = createConeIssuanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),

        items: [
          { color: "Red", batchId: crypto.randomUUID(), quantityKg: 100 },
        ],
        notes: "Issuing for weekly production",
      });
      expect(result.success).toBe(true);
    });

    it("accepts per-item godownId override", () => {
      const result = createConeIssuanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),

        items: [
          { color: "White", quantityKg: 30, godownId: crypto.randomUUID() },
          { color: "Red", quantityKg: 20 },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items[0].godownId).toBeDefined();
        expect(result.data.items[1].godownId).toBeUndefined();
      }
    });

    it("rejects missing required fields", () => {
      const result = createConeIssuanceSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects empty items array", () => {
      const result = createConeIssuanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),

        items: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero quantity in item", () => {
      const result = createConeIssuanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),

        items: [{ color: "White", quantityKg: 0 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty color in item", () => {
      const result = createConeIssuanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),

        items: [{ color: "", quantityKg: 50 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid UUID", () => {
      const result = createConeIssuanceSchema.safeParse({
        wagerId: "not-uuid",
        godownId: crypto.randomUUID(),

        items: [{ color: "White", quantityKg: 50 }],
      });
      expect(result.success).toBe(false);
    });

    it("coerces string numbers in item quantityKg", () => {
      const result = createConeIssuanceSchema.parse({
        wagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),

        items: [{ color: "White", quantityKg: "50" }],
      });
      expect(result.items[0].quantityKg).toBe(50);
    });
  });

  describe("coneIssuanceListQuerySchema", () => {
    it("provides defaults", () => {
      const result = coneIssuanceListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts all filters", () => {
      const result = coneIssuanceListQuerySchema.parse({
        wagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),

      });
      expect(result.wagerId).toBeDefined();
      expect(result.godownId).toBeDefined();
    });

    it("rejects invalid UUID filters", () => {
      const result = coneIssuanceListQuerySchema.safeParse({
        wagerId: "not-uuid",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Cone Issuance Routes", () => {
  it("POST /api/cone-issuances requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).post("/api/cone-issuances").send({
      wagerId: crypto.randomUUID(),
      godownId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      items: [{ color: "White", quantityKg: 50 }],
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/cone-issuances requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .post("/api/cone-issuances")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        wagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),

        items: [{ color: "White", quantityKg: 50 }],
      });

    expect(res.status).toBe(403);
  });

  it("POST /api/cone-issuances returns 400 for missing fields", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/cone-issuances")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST /api/cone-issuances returns 400 for empty items array", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/cone-issuances")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        wagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),

        items: [],
      });

    expect(res.status).toBe(400);
  });

  it("GET /api/cone-issuances requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/cone-issuances");

    expect(res.status).toBe(401);
  });

  it("GET /api/cone-issuances/:id requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get(`/api/cone-issuances/${crypto.randomUUID()}`);

    expect(res.status).toBe(401);
  });
});
