import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createShiftSchema,
  updateShiftSchema,
  shiftListQuerySchema,
} from "../shift.schema.js";
import crypto from "crypto";

describe("Shift Schemas", () => {
  describe("createShiftSchema", () => {
    it("accepts valid shift data", () => {
      const result = createShiftSchema.safeParse({
        name: "Morning Shift",
        startTime: "06:00",
        endTime: "14:00",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing name", () => {
      const result = createShiftSchema.safeParse({
        startTime: "06:00",
        endTime: "14:00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createShiftSchema.safeParse({
        name: "",
        startTime: "06:00",
        endTime: "14:00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing times", () => {
      const result = createShiftSchema.safeParse({
        name: "Morning Shift",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateShiftSchema", () => {
    it("accepts partial update with name", () => {
      const result = updateShiftSchema.safeParse({
        name: "Evening Shift",
      });
      expect(result.success).toBe(true);
    });

    it("accepts isActive toggle", () => {
      const result = updateShiftSchema.safeParse({
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = updateShiftSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts full update", () => {
      const result = updateShiftSchema.safeParse({
        name: "Night Shift",
        startTime: "22:00",
        endTime: "06:00",
        isActive: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("shiftListQuerySchema", () => {
    it("provides defaults", () => {
      const result = shiftListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("enforces limit range", () => {
      expect(shiftListQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(shiftListQuerySchema.safeParse({ limit: 101 }).success).toBe(
        false,
      );
    });
  });
});

describe("Shift Routes", () => {
  it("POST /api/shifts requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).post("/api/shifts").send({
      name: "Morning Shift",
      startTime: "06:00",
      endTime: "14:00",
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/shifts requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .post("/api/shifts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Morning Shift",
        startTime: "06:00",
        endTime: "14:00",
      });

    expect(res.status).toBe(403);
  });

  it("POST /api/shifts returns 400 for missing fields", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/shifts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("PUT /api/shifts/:id requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .put(`/api/shifts/${crypto.randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated Shift" });

    expect(res.status).toBe(403);
  });

  it("GET /api/shifts requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/shifts");

    expect(res.status).toBe(401);
  });
});

describe("Wager Performance & Ranking Routes", () => {
  it("GET /api/wagers/:id/performance requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get(
      `/api/wagers/${crypto.randomUUID()}/performance?from=2026-02-08&to=2026-02-14`,
    );

    expect(res.status).toBe(401);
  });

  it("GET /api/wagers/:id/performance requires date range", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .get(`/api/wagers/${crypto.randomUUID()}/performance`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it("GET /api/wagers/ranking requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/wagers/ranking");

    expect(res.status).toBe(401);
  });

  it("GET /api/wagers/ranking requires owner/staff role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .get("/api/wagers/ranking")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });
});
