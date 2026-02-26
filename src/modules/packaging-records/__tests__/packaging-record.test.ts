import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createPackagingRecordSchema,
  packagingRecordListQuerySchema,
} from "../packaging-record.schema.js";
import crypto from "crypto";

describe("Packaging Record Schemas", () => {
  describe("createPackagingRecordSchema", () => {
    const validData = {
      packagerId: crypto.randomUUID(),
      godownId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      color: "White",
      bundleType: "small" as const,
      bundleCount: 8,
    };

    it("accepts valid packaging record data", () => {
      const result = createPackagingRecordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("accepts both bundle types", () => {
      for (const bundleType of ["small", "large"]) {
        const result = createPackagingRecordSchema.safeParse({
          ...validData,
          bundleType,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid bundle type", () => {
      const result = createPackagingRecordSchema.safeParse({
        ...validData,
        bundleType: "medium",
      });
      expect(result.success).toBe(false);
    });

    it("rejects bundleCount of 0", () => {
      const result = createPackagingRecordSchema.safeParse({
        ...validData,
        bundleCount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative bundleCount", () => {
      const result = createPackagingRecordSchema.safeParse({
        ...validData,
        bundleCount: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing packagerId", () => {
      const { packagerId, ...noPackager } = validData;
      const result = createPackagingRecordSchema.safeParse(noPackager);
      expect(result.success).toBe(false);
    });

    it("rejects missing productId", () => {
      const { productId, ...noProduct } = validData;
      const result = createPackagingRecordSchema.safeParse(noProduct);
      expect(result.success).toBe(false);
    });

    it("rejects empty color", () => {
      const result = createPackagingRecordSchema.safeParse({
        ...validData,
        color: "",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional batchId", () => {
      const result = createPackagingRecordSchema.safeParse({
        ...validData,
        batchId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional notes", () => {
      const result = createPackagingRecordSchema.safeParse({
        ...validData,
        notes: "Neatly packed",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing bundleType", () => {
      const { bundleType, ...noBundleType } = validData;
      const result = createPackagingRecordSchema.safeParse(noBundleType);
      expect(result.success).toBe(false);
    });
  });

  describe("packagingRecordListQuerySchema", () => {
    it("accepts empty query with defaults", () => {
      const result = packagingRecordListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("accepts filter by packagerId", () => {
      const result = packagingRecordListQuerySchema.safeParse({
        packagerId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts filter by bundleType", () => {
      const result = packagingRecordListQuerySchema.safeParse({
        bundleType: "small",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid bundleType filter", () => {
      const result = packagingRecordListQuerySchema.safeParse({
        bundleType: "medium",
      });
      expect(result.success).toBe(false);
    });

    it("accepts date range filters", () => {
      const result = packagingRecordListQuerySchema.safeParse({
        from: "2026-01-01",
        to: "2026-01-31",
      });
      expect(result.success).toBe(true);
    });

    it("coerces string limit/offset to numbers", () => {
      const result = packagingRecordListQuerySchema.safeParse({
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

describe("Packaging Record Routes", () => {
  it("POST /api/packaging-records requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).post("/api/packaging-records").send({
      packagerId: crypto.randomUUID(),
      godownId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      color: "White",
      bundleType: "small",
      bundleCount: 8,
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/packaging-records requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(
      undefined,
      undefined,
      UserRole.PACKAGER,
    );
    const res = await request(app)
      .post("/api/packaging-records")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        packagerId: crypto.randomUUID(),
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        bundleType: "small",
        bundleCount: 8,
      });
    expect(res.status).toBe(403);
  });

  it("GET /api/packaging-records requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get("/api/packaging-records");
    expect(res.status).toBe(401);
  });

  it("GET /api/packaging-records/:id requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get(
      `/api/packaging-records/${crypto.randomUUID()}`,
    );
    expect(res.status).toBe(401);
  });
});
