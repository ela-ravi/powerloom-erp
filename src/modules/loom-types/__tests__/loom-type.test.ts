import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createLoomTypeSchema,
  updateLoomTypeSchema,
  loomTypeListQuerySchema,
} from "../loom-type.schema.js";

describe("Loom Type Schemas", () => {
  describe("createLoomTypeSchema", () => {
    it("accepts valid loom type data", () => {
      const result = createLoomTypeSchema.safeParse({
        name: "Single Lengthy",
        capacityPiecesPerDay: 15,
      });
      expect(result.success).toBe(true);
    });

    it("accepts data with nickname", () => {
      const result = createLoomTypeSchema.safeParse({
        name: "Double Lengthy",
        nickname: "Box",
        capacityPiecesPerDay: 8,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("Box");
      }
    });

    it("rejects missing name", () => {
      const result = createLoomTypeSchema.safeParse({
        capacityPiecesPerDay: 15,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing capacity", () => {
      const result = createLoomTypeSchema.safeParse({
        name: "Single Lengthy",
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero capacity", () => {
      const result = createLoomTypeSchema.safeParse({
        name: "Single Lengthy",
        capacityPiecesPerDay: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative capacity", () => {
      const result = createLoomTypeSchema.safeParse({
        name: "Single Lengthy",
        capacityPiecesPerDay: -5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer capacity", () => {
      const result = createLoomTypeSchema.safeParse({
        name: "Single Lengthy",
        capacityPiecesPerDay: 15.5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding max length", () => {
      const result = createLoomTypeSchema.safeParse({
        name: "a".repeat(101),
        capacityPiecesPerDay: 15,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateLoomTypeSchema", () => {
    it("accepts partial update", () => {
      const result = updateLoomTypeSchema.safeParse({
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });

    it("accepts isActive field", () => {
      const result = updateLoomTypeSchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    it("accepts nullable nickname", () => {
      const result = updateLoomTypeSchema.safeParse({ nickname: null });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = updateLoomTypeSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("loomTypeListQuerySchema", () => {
    it("provides defaults", () => {
      const result = loomTypeListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("transforms isActive string to boolean", () => {
      const result = loomTypeListQuerySchema.parse({ isActive: "true" });
      expect(result.isActive).toBe(true);
    });
  });
});

describe("Loom Type Routes", () => {
  it("POST /api/loom-types requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app)
      .post("/api/loom-types")
      .send({ name: "Single Lengthy", capacityPiecesPerDay: 15 });

    expect(res.status).toBe(401);
  });

  it("POST /api/loom-types returns 400 for invalid body", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/loom-types")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test" }); // missing capacityPiecesPerDay

    expect(res.status).toBe(400);
  });

  it("GET /api/loom-types requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/loom-types");

    expect(res.status).toBe(401);
  });

  it("PUT /api/loom-types/:id requires master_data permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .put("/api/loom-types/some-id")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated" });

    expect(res.status).toBe(403);
  });
});
