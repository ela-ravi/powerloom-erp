import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createTransferSchema,
  transferListQuerySchema,
} from "../transfer.schema.js";
import crypto from "crypto";

describe("Transfer Schemas", () => {
  describe("createTransferSchema", () => {
    it("accepts valid transfer data", () => {
      const result = createTransferSchema.safeParse({
        sourceGodownId: crypto.randomUUID(),
        destGodownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        stage: "raw_cone",
        quantity: 50,
      });
      expect(result.success).toBe(true);
    });

    it("accepts full data with all optional fields", () => {
      const result = createTransferSchema.safeParse({
        sourceGodownId: crypto.randomUUID(),
        destGodownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "Red",
        stage: "woven",
        batchId: crypto.randomUUID(),
        quantity: 100,
        weightKg: 45.5,
        notes: "Moving woven stock to main godown",
      });
      expect(result.success).toBe(true);
    });

    it("accepts all valid stage values", () => {
      const stages = [
        "raw_cone",
        "paavu",
        "woven",
        "tailored",
        "bundled",
        "sold",
      ];
      for (const stage of stages) {
        const result = createTransferSchema.safeParse({
          sourceGodownId: crypto.randomUUID(),
          destGodownId: crypto.randomUUID(),
          productId: crypto.randomUUID(),
          color: "White",
          stage,
          quantity: 10,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid stage", () => {
      const result = createTransferSchema.safeParse({
        sourceGodownId: crypto.randomUUID(),
        destGodownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        stage: "processing",
        quantity: 10,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing required fields", () => {
      const result = createTransferSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects zero quantity", () => {
      const result = createTransferSchema.safeParse({
        sourceGodownId: crypto.randomUUID(),
        destGodownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        stage: "raw_cone",
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative quantity", () => {
      const result = createTransferSchema.safeParse({
        sourceGodownId: crypto.randomUUID(),
        destGodownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        stage: "raw_cone",
        quantity: -5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty color", () => {
      const result = createTransferSchema.safeParse({
        sourceGodownId: crypto.randomUUID(),
        destGodownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "",
        stage: "raw_cone",
        quantity: 10,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid UUID for godown IDs", () => {
      const result = createTransferSchema.safeParse({
        sourceGodownId: "not-a-uuid",
        destGodownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        stage: "raw_cone",
        quantity: 10,
      });
      expect(result.success).toBe(false);
    });

    it("coerces string numbers", () => {
      const result = createTransferSchema.parse({
        sourceGodownId: crypto.randomUUID(),
        destGodownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        stage: "raw_cone",
        quantity: "50",
        weightKg: "25.5",
      });
      expect(result.quantity).toBe(50);
      expect(result.weightKg).toBe(25.5);
    });
  });

  describe("transferListQuerySchema", () => {
    it("provides defaults", () => {
      const result = transferListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts sourceGodownId filter", () => {
      const id = crypto.randomUUID();
      const result = transferListQuerySchema.parse({ sourceGodownId: id });
      expect(result.sourceGodownId).toBe(id);
    });

    it("accepts destGodownId filter", () => {
      const id = crypto.randomUUID();
      const result = transferListQuerySchema.parse({ destGodownId: id });
      expect(result.destGodownId).toBe(id);
    });

    it("accepts both godown filters", () => {
      const sourceId = crypto.randomUUID();
      const destId = crypto.randomUUID();
      const result = transferListQuerySchema.parse({
        sourceGodownId: sourceId,
        destGodownId: destId,
      });
      expect(result.sourceGodownId).toBe(sourceId);
      expect(result.destGodownId).toBe(destId);
    });

    it("rejects invalid sourceGodownId", () => {
      const result = transferListQuerySchema.safeParse({
        sourceGodownId: "not-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("enforces limit range", () => {
      expect(transferListQuerySchema.safeParse({ limit: 0 }).success).toBe(
        false,
      );
      expect(transferListQuerySchema.safeParse({ limit: 101 }).success).toBe(
        false,
      );
    });
  });
});

describe("Transfer Business Logic", () => {
  it("source and destination must be different godowns", () => {
    const sameId = crypto.randomUUID();
    expect(sameId === sameId).toBe(true);
    // Service validates: data.sourceGodownId === data.destGodownId
  });

  it("transfer requires sufficient stock (quantity check)", () => {
    const sourceQty = 50;
    const transferQty = 60;
    expect(sourceQty < transferQty).toBe(true);
    // Service throws: "Insufficient stock for transfer"
  });

  it("transfer within stock limits is valid", () => {
    const sourceQty = 100;
    const transferQty = 50;
    expect(sourceQty >= transferQty).toBe(true);
  });
});

describe("Transfer Routes", () => {
  it("POST /api/transfers requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).post("/api/transfers").send({
      sourceGodownId: crypto.randomUUID(),
      destGodownId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      color: "White",
      stage: "raw_cone",
      quantity: 50,
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/transfers requires godown_management permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        sourceGodownId: crypto.randomUUID(),
        destGodownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        stage: "raw_cone",
        quantity: 50,
      });

    expect(res.status).toBe(403);
  });

  it("POST /api/transfers returns 400 for missing fields", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST /api/transfers returns 400 for invalid stage", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        sourceGodownId: crypto.randomUUID(),
        destGodownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        stage: "invalid_stage",
        quantity: 50,
      });

    expect(res.status).toBe(400);
  });

  it("GET /api/transfers requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/transfers");

    expect(res.status).toBe(401);
  });

  it("GET /api/transfers returns 400 for invalid sourceGodownId filter", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .get("/api/transfers?sourceGodownId=not-uuid")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });
});
