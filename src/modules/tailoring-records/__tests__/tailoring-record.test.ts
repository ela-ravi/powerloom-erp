import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createTailoringRecordSchema,
  tailoringRecordListQuerySchema,
} from "../tailoring-record.schema.js";
import crypto from "crypto";

describe("Tailoring Record Schemas", () => {
  describe("createTailoringRecordSchema", () => {
    const validData = {
      tailorId: crypto.randomUUID(),
      godownId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      color: "White",
      stitchCount: 100,
    };

    it("accepts valid tailoring record data", () => {
      const result = createTailoringRecordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("defaults knotCount to 0", () => {
      const result = createTailoringRecordSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.knotCount).toBe(0);
      }
    });

    it("accepts knotCount", () => {
      const result = createTailoringRecordSchema.safeParse({
        ...validData,
        knotCount: 50,
      });
      expect(result.success).toBe(true);
    });

    it("rejects stitchCount of 0", () => {
      const result = createTailoringRecordSchema.safeParse({
        ...validData,
        stitchCount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative stitchCount", () => {
      const result = createTailoringRecordSchema.safeParse({
        ...validData,
        stitchCount: -5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative knotCount", () => {
      const result = createTailoringRecordSchema.safeParse({
        ...validData,
        knotCount: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing tailorId", () => {
      const { tailorId, ...noTailor } = validData;
      const result = createTailoringRecordSchema.safeParse(noTailor);
      expect(result.success).toBe(false);
    });

    it("rejects missing productId", () => {
      const { productId, ...noProduct } = validData;
      const result = createTailoringRecordSchema.safeParse(noProduct);
      expect(result.success).toBe(false);
    });

    it("rejects empty color", () => {
      const result = createTailoringRecordSchema.safeParse({
        ...validData,
        color: "",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional batchId", () => {
      const result = createTailoringRecordSchema.safeParse({
        ...validData,
        batchId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional notes", () => {
      const result = createTailoringRecordSchema.safeParse({
        ...validData,
        notes: "Good quality stitching",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("tailoringRecordListQuerySchema", () => {
    it("accepts empty query with defaults", () => {
      const result = tailoringRecordListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("accepts filter by tailorId", () => {
      const result = tailoringRecordListQuerySchema.safeParse({
        tailorId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts date range filters", () => {
      const result = tailoringRecordListQuerySchema.safeParse({
        from: "2026-01-01",
        to: "2026-01-31",
      });
      expect(result.success).toBe(true);
    });

    it("coerces string limit/offset to numbers", () => {
      const result = tailoringRecordListQuerySchema.safeParse({
        limit: "10",
        offset: "5",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(5);
      }
    });
  });
});

describe("Tailoring Record Routes", () => {
  it("POST /api/tailoring-records requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).post("/api/tailoring-records").send({
      tailorId: crypto.randomUUID(),
      godownId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      color: "White",
      stitchCount: 100,
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/tailoring-records requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.TAILOR);
    const res = await request(app)
      .post("/api/tailoring-records")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        tailorId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        stitchCount: 100,
      });
    expect(res.status).toBe(403);
  });

  it("GET /api/tailoring-records requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get("/api/tailoring-records");
    expect(res.status).toBe(401);
  });

  it("GET /api/tailoring-records/:id requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get(
      `/api/tailoring-records/${crypto.randomUUID()}`,
    );
    expect(res.status).toBe(401);
  });
});
