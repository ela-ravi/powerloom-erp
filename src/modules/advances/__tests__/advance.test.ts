import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createAdvanceSchema,
  advanceListQuerySchema,
} from "../advance.schema.js";
import crypto from "crypto";

describe("Advance Schemas", () => {
  describe("createAdvanceSchema", () => {
    it("accepts valid advance data", () => {
      const result = createAdvanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        amount: 5000,
      });
      expect(result.success).toBe(true);
    });

    it("rejects zero amount", () => {
      const result = createAdvanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative amount", () => {
      const result = createAdvanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        amount: -100,
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional notes", () => {
      const result = createAdvanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        amount: 5000,
        notes: "Weekly advance",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing wagerId", () => {
      const result = createAdvanceSchema.safeParse({ amount: 5000 });
      expect(result.success).toBe(false);
    });

    it("rejects missing amount", () => {
      const result = createAdvanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
      });
      expect(result.success).toBe(false);
    });

    it("accepts decimal amounts", () => {
      const result = createAdvanceSchema.safeParse({
        wagerId: crypto.randomUUID(),
        amount: 2500.5,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("advanceListQuerySchema", () => {
    it("accepts empty query with defaults", () => {
      const result = advanceListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("accepts filter by wagerId", () => {
      const result = advanceListQuerySchema.safeParse({
        wagerId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts filter by type", () => {
      for (const type of [
        "advance_given",
        "advance_deduction",
        "discretionary_addition",
      ]) {
        const result = advanceListQuerySchema.safeParse({ type });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid type", () => {
      const result = advanceListQuerySchema.safeParse({
        type: "refund",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Advance Routes", () => {
  it("POST /api/advances requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).post("/api/advances").send({
      wagerId: crypto.randomUUID(),
      amount: 5000,
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/advances requires wage_processing permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .post("/api/advances")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ wagerId: crypto.randomUUID(), amount: 5000 });
    expect(res.status).toBe(403);
  });

  it("GET /api/advances requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get("/api/advances");
    expect(res.status).toBe(401);
  });

  it("GET /api/advances requires wage_processing permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .get("/api/advances")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });
});
