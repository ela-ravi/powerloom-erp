import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  generateWageCycleSchema,
  wageCycleListQuerySchema,
  setDiscretionarySchema,
} from "../wage-cycle.schema.js";
import crypto from "crypto";

describe("Wage Cycle Schemas", () => {
  describe("generateWageCycleSchema", () => {
    it("accepts valid generate data", () => {
      const result = generateWageCycleSchema.safeParse({
        cycleStartDate: "2026-02-10",
        cycleEndDate: "2026-02-16",
      });
      expect(result.success).toBe(true);
    });

    it("defaults advanceDeductionAmount to 0", () => {
      const result = generateWageCycleSchema.safeParse({
        cycleStartDate: "2026-02-10",
        cycleEndDate: "2026-02-16",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.advanceDeductionAmount).toBe(0);
      }
    });

    it("accepts advanceDeductionAmount", () => {
      const result = generateWageCycleSchema.safeParse({
        cycleStartDate: "2026-02-10",
        cycleEndDate: "2026-02-16",
        advanceDeductionAmount: 500,
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative advanceDeductionAmount", () => {
      const result = generateWageCycleSchema.safeParse({
        cycleStartDate: "2026-02-10",
        cycleEndDate: "2026-02-16",
        advanceDeductionAmount: -100,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing cycleStartDate", () => {
      const result = generateWageCycleSchema.safeParse({
        cycleEndDate: "2026-02-16",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing cycleEndDate", () => {
      const result = generateWageCycleSchema.safeParse({
        cycleStartDate: "2026-02-10",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("wageCycleListQuerySchema", () => {
    it("accepts empty query with defaults", () => {
      const result = wageCycleListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("accepts all valid statuses", () => {
      for (const status of ["draft", "review", "approved", "paid"]) {
        const result = wageCycleListQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid status", () => {
      const result = wageCycleListQuerySchema.safeParse({
        status: "cancelled",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("setDiscretionarySchema", () => {
    it("accepts valid discretionary data", () => {
      const result = setDiscretionarySchema.safeParse({
        wageRecordId: crypto.randomUUID(),
        amount: 2000,
      });
      expect(result.success).toBe(true);
    });

    it("accepts zero amount", () => {
      const result = setDiscretionarySchema.safeParse({
        wageRecordId: crypto.randomUUID(),
        amount: 0,
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative amount", () => {
      const result = setDiscretionarySchema.safeParse({
        wageRecordId: crypto.randomUUID(),
        amount: -100,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing wageRecordId", () => {
      const result = setDiscretionarySchema.safeParse({ amount: 2000 });
      expect(result.success).toBe(false);
    });
  });
});

describe("Wage Cycle Routes", () => {
  it("POST /api/wage-cycles/generate requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).post("/api/wage-cycles/generate").send({
      cycleStartDate: "2026-02-10",
      cycleEndDate: "2026-02-16",
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/wage-cycles/generate requires owner role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.STAFF);
    const res = await request(app)
      .post("/api/wage-cycles/generate")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        cycleStartDate: "2026-02-10",
        cycleEndDate: "2026-02-16",
      });
    expect(res.status).toBe(403);
  });

  it("GET /api/wage-cycles requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get("/api/wage-cycles");
    expect(res.status).toBe(401);
  });

  it("GET /api/wage-cycles requires wage_processing permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .get("/api/wage-cycles")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("PUT /api/wage-cycles/:id/review requires owner role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.STAFF);
    const res = await request(app)
      .put(`/api/wage-cycles/${crypto.randomUUID()}/review`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("PUT /api/wage-cycles/:id/approve requires owner role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.STAFF);
    const res = await request(app)
      .put(`/api/wage-cycles/${crypto.randomUUID()}/approve`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("PUT /api/wage-cycles/:id/pay requires owner role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.STAFF);
    const res = await request(app)
      .put(`/api/wage-cycles/${crypto.randomUUID()}/pay`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/wage-cycles/worker/me requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get("/api/wage-cycles/worker/me");
    expect(res.status).toBe(401);
  });
});
