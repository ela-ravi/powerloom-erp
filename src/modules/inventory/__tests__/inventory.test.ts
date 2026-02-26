import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  inventoryListQuerySchema,
  inventorySummaryQuerySchema,
  movementListQuerySchema,
} from "../inventory.schema.js";
import crypto from "crypto";

describe("Inventory Schemas", () => {
  describe("inventoryListQuerySchema", () => {
    it("provides defaults", () => {
      const result = inventoryListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts all filter combinations", () => {
      const result = inventoryListQuerySchema.parse({
        godownId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        color: "White",
        stage: "raw_cone",
        batchId: crypto.randomUUID(),
      });
      expect(result.color).toBe("White");
      expect(result.stage).toBe("raw_cone");
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
        const result = inventoryListQuerySchema.safeParse({ stage });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid stage", () => {
      const result = inventoryListQuerySchema.safeParse({
        stage: "processing",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid godownId", () => {
      const result = inventoryListQuerySchema.safeParse({
        godownId: "not-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("enforces limit range", () => {
      expect(inventoryListQuerySchema.safeParse({ limit: 0 }).success).toBe(
        false,
      );
      expect(inventoryListQuerySchema.safeParse({ limit: 101 }).success).toBe(
        false,
      );
    });

    it("coerces string numbers", () => {
      const result = inventoryListQuerySchema.parse({
        limit: "50",
        offset: "10",
      });
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
    });
  });

  describe("inventorySummaryQuerySchema", () => {
    it("accepts empty query", () => {
      const result = inventorySummaryQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts godownId filter", () => {
      const id = crypto.randomUUID();
      const result = inventorySummaryQuerySchema.parse({ godownId: id });
      expect(result.godownId).toBe(id);
    });

    it("accepts productId filter", () => {
      const id = crypto.randomUUID();
      const result = inventorySummaryQuerySchema.parse({ productId: id });
      expect(result.productId).toBe(id);
    });

    it("rejects invalid godownId", () => {
      const result = inventorySummaryQuerySchema.safeParse({
        godownId: "not-uuid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("movementListQuerySchema", () => {
    it("provides defaults", () => {
      const result = movementListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts custom pagination", () => {
      const result = movementListQuerySchema.parse({
        limit: 50,
        offset: 25,
      });
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(25);
    });

    it("rejects invalid limit", () => {
      expect(movementListQuerySchema.safeParse({ limit: 0 }).success).toBe(
        false,
      );
      expect(movementListQuerySchema.safeParse({ limit: 101 }).success).toBe(
        false,
      );
    });

    it("rejects negative offset", () => {
      const result = movementListQuerySchema.safeParse({ offset: -1 });
      expect(result.success).toBe(false);
    });
  });
});

describe("Inventory Routes", () => {
  it("GET /api/inventory requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/inventory");

    expect(res.status).toBe(401);
  });

  it("GET /api/inventory returns 400 for invalid stage filter", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .get("/api/inventory?stage=invalid_stage")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it("GET /api/inventory returns 400 for invalid godownId filter", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .get("/api/inventory?godownId=not-uuid")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it("GET /api/inventory/summary requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/inventory/summary");

    expect(res.status).toBe(401);
  });

  it("GET /api/inventory/summary returns 400 for invalid godownId", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .get("/api/inventory/summary?godownId=not-uuid")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it("GET /api/inventory/:id/movements requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get(
      `/api/inventory/${crypto.randomUUID()}/movements`,
    );

    expect(res.status).toBe(401);
  });
});
