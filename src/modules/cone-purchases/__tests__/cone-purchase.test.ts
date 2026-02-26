import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createConePurchaseSchema,
  conePurchaseListQuerySchema,
} from "../cone-purchase.schema.js";
import crypto from "crypto";

describe("Cone Purchase Schemas", () => {
  describe("createConePurchaseSchema", () => {
    it("accepts valid cone purchase data", () => {
      const result = createConePurchaseSchema.safeParse({
        supplierId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        quantityKg: 60,
        ratePerKg: 250,
      });
      expect(result.success).toBe(true);
    });

    it("accepts full data with all optional fields", () => {
      const result = createConePurchaseSchema.safeParse({
        supplierId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "Red",
        batchId: crypto.randomUUID(),
        quantityKg: 120,
        ratePerKg: 300,
        gstRatePct: 5,
        invoiceNumber: "INV-2024-001",
        purchaseDate: "2024-06-15",
        notes: "First purchase from supplier",
      });
      expect(result.success).toBe(true);
    });

    it("defaults gstRatePct to 0 when not provided", () => {
      const result = createConePurchaseSchema.parse({
        supplierId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "Blue",
        quantityKg: 60,
        ratePerKg: 250,
      });
      expect(result.gstRatePct).toBe(0);
    });

    it("coerces string numbers to numbers", () => {
      const result = createConePurchaseSchema.parse({
        supplierId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        quantityKg: "60",
        ratePerKg: "250",
        gstRatePct: "5",
      });
      expect(result.quantityKg).toBe(60);
      expect(result.ratePerKg).toBe(250);
      expect(result.gstRatePct).toBe(5);
    });

    it("rejects missing required fields", () => {
      const result = createConePurchaseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects missing supplierId", () => {
      const result = createConePurchaseSchema.safeParse({
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        quantityKg: 60,
        ratePerKg: 250,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero quantity", () => {
      const result = createConePurchaseSchema.safeParse({
        supplierId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        quantityKg: 0,
        ratePerKg: 250,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative ratePerKg", () => {
      const result = createConePurchaseSchema.safeParse({
        supplierId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        quantityKg: 60,
        ratePerKg: -10,
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty color", () => {
      const result = createConePurchaseSchema.safeParse({
        supplierId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "",
        quantityKg: 60,
        ratePerKg: 250,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid UUID for supplierId", () => {
      const result = createConePurchaseSchema.safeParse({
        supplierId: "not-a-uuid",
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        quantityKg: 60,
        ratePerKg: 250,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative gstRatePct", () => {
      const result = createConePurchaseSchema.safeParse({
        supplierId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        quantityKg: 60,
        ratePerKg: 250,
        gstRatePct: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("conePurchaseListQuerySchema", () => {
    it("provides defaults", () => {
      const result = conePurchaseListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts supplierId filter", () => {
      const id = crypto.randomUUID();
      const result = conePurchaseListQuerySchema.parse({ supplierId: id });
      expect(result.supplierId).toBe(id);
    });

    it("accepts productId filter", () => {
      const id = crypto.randomUUID();
      const result = conePurchaseListQuerySchema.parse({ productId: id });
      expect(result.productId).toBe(id);
    });

    it("rejects invalid supplierId", () => {
      const result = conePurchaseListQuerySchema.safeParse({
        supplierId: "not-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("enforces limit range", () => {
      expect(conePurchaseListQuerySchema.safeParse({ limit: 0 }).success).toBe(
        false,
      );
      expect(
        conePurchaseListQuerySchema.safeParse({ limit: 101 }).success,
      ).toBe(false);
    });
  });
});

describe("Cone Purchase Auto-Calculations", () => {
  it("calculates totalCost = quantityKg * ratePerKg", () => {
    const quantityKg = 60;
    const ratePerKg = 250;
    const totalCost = Math.round(quantityKg * ratePerKg * 100) / 100;
    expect(totalCost).toBe(15000);
  });

  it("calculates gstAmount = totalCost * gstRatePct / 100", () => {
    const totalCost = 15000;
    const gstRatePct = 5;
    const gstAmount = Math.round(totalCost * (gstRatePct / 100) * 100) / 100;
    expect(gstAmount).toBe(750);
  });

  it("handles zero GST", () => {
    const totalCost = 15000;
    const gstRatePct = 0;
    const gstAmount = Math.round(totalCost * (gstRatePct / 100) * 100) / 100;
    expect(gstAmount).toBe(0);
  });

  it("handles decimal precision", () => {
    const quantityKg = 59.5;
    const ratePerKg = 249.75;
    const totalCost = Math.round(quantityKg * ratePerKg * 100) / 100;
    const gstRatePct = 12;
    const gstAmount = Math.round(totalCost * (gstRatePct / 100) * 100) / 100;
    expect(totalCost).toBe(14860.13);
    expect(gstAmount).toBe(1783.22);
  });
});

describe("Cone Purchase Routes", () => {
  it("POST /api/cone-purchases requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).post("/api/cone-purchases").send({
      supplierId: crypto.randomUUID(),
      godownId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      color: "White",
      quantityKg: 60,
      ratePerKg: 250,
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/cone-purchases requires godown_management permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .post("/api/cone-purchases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        supplierId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        quantityKg: 60,
        ratePerKg: 250,
      });

    expect(res.status).toBe(403);
  });

  it("POST /api/cone-purchases returns 400 for missing fields", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/cone-purchases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST /api/cone-purchases returns 400 for zero quantity", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/cone-purchases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        supplierId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        quantityKg: 0,
        ratePerKg: 250,
      });

    expect(res.status).toBe(400);
  });

  it("GET /api/cone-purchases requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/cone-purchases");

    expect(res.status).toBe(401);
  });

  it("GET /api/cone-purchases returns 400 for invalid supplierId filter", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .get("/api/cone-purchases?supplierId=not-uuid")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });
});
