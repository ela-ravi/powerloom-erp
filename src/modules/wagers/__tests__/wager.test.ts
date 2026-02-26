import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createWagerSchema,
  updateWagerSchema,
  wagerListQuerySchema,
} from "../wager.schema.js";
import crypto from "crypto";

describe("Wager Schemas", () => {
  describe("createWagerSchema", () => {
    it("accepts valid wager profile data", () => {
      const result = createWagerSchema.safeParse({
        userId: crypto.randomUUID(),
        wagerType: 1,
      });
      expect(result.success).toBe(true);
    });

    it("accepts all wager types (1-4)", () => {
      for (const wagerType of [1, 2, 3, 4]) {
        expect(
          createWagerSchema.safeParse({
            userId: crypto.randomUUID(),
            wagerType,
          }).success,
        ).toBe(true);
      }
    });

    it("rejects wager type 0", () => {
      const result = createWagerSchema.safeParse({
        userId: crypto.randomUUID(),
        wagerType: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects wager type 5", () => {
      const result = createWagerSchema.safeParse({
        userId: crypto.randomUUID(),
        wagerType: 5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer wager type", () => {
      const result = createWagerSchema.safeParse({
        userId: crypto.randomUUID(),
        wagerType: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it("defaults advance balance to 0", () => {
      const result = createWagerSchema.parse({
        userId: crypto.randomUUID(),
        wagerType: 1,
      });
      expect(result.advanceBalance).toBe(0);
    });

    it("defaults original advance to 0", () => {
      const result = createWagerSchema.parse({
        userId: crypto.randomUUID(),
        wagerType: 1,
      });
      expect(result.originalAdvance).toBe(0);
    });

    it("accepts advance balance", () => {
      const result = createWagerSchema.safeParse({
        userId: crypto.randomUUID(),
        wagerType: 2,
        advanceBalance: 5000,
        originalAdvance: 5000,
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing userId", () => {
      const result = createWagerSchema.safeParse({ wagerType: 1 });
      expect(result.success).toBe(false);
    });

    it("rejects invalid userId format", () => {
      const result = createWagerSchema.safeParse({
        userId: "not-a-uuid",
        wagerType: 1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative advance balance", () => {
      const result = createWagerSchema.safeParse({
        userId: crypto.randomUUID(),
        wagerType: 1,
        advanceBalance: -100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateWagerSchema", () => {
    it("accepts wager type update", () => {
      const result = updateWagerSchema.safeParse({ wagerType: 3 });
      expect(result.success).toBe(true);
    });

    it("accepts isActive field", () => {
      const result = updateWagerSchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    it("rejects invalid wager type", () => {
      const result = updateWagerSchema.safeParse({ wagerType: 5 });
      expect(result.success).toBe(false);
    });

    it("accepts empty object", () => {
      const result = updateWagerSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("wagerListQuerySchema", () => {
    it("provides defaults", () => {
      const result = wagerListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts wagerType filter", () => {
      const result = wagerListQuerySchema.parse({ wagerType: "2" });
      expect(result.wagerType).toBe(2);
    });

    it("transforms isActive string to boolean", () => {
      const result = wagerListQuerySchema.parse({ isActive: "true" });
      expect(result.isActive).toBe(true);
    });

    it("rejects invalid wagerType filter", () => {
      const result = wagerListQuerySchema.safeParse({ wagerType: "5" });
      expect(result.success).toBe(false);
    });
  });
});

describe("Wager Routes", () => {
  it("POST /api/wagers requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).post("/api/wagers").send({
      userId: crypto.randomUUID(),
      wagerType: 1,
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/wagers requires owner role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.STAFF);

    const res = await request(app)
      .post("/api/wagers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ userId: crypto.randomUUID(), wagerType: 1 });

    expect(res.status).toBe(403);
  });

  it("GET /api/wagers requires owner or staff role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .get("/api/wagers")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it("PUT /api/wagers/:id requires owner role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.STAFF);

    const res = await request(app)
      .put("/api/wagers/some-id")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ wagerType: 2 });

    expect(res.status).toBe(403);
  });

  it("GET /api/wagers/:id requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get(`/api/wagers/${crypto.randomUUID()}`);

    expect(res.status).toBe(401);
  });
});
