import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import { fraudAlertListQuerySchema } from "../fraud-alert.schema.js";
import crypto from "crypto";

describe("Fraud Alert Schemas", () => {
  describe("fraudAlertListQuerySchema", () => {
    it("accepts empty query with defaults", () => {
      const result = fraudAlertListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("accepts filter by alertType", () => {
      const result = fraudAlertListQuerySchema.safeParse({
        alertType: "color_substitution",
      });
      expect(result.success).toBe(true);
    });

    it("accepts filter by severity", () => {
      for (const severity of ["low", "medium", "high", "critical"]) {
        const result = fraudAlertListQuerySchema.safeParse({ severity });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid severity", () => {
      const result = fraudAlertListQuerySchema.safeParse({
        severity: "extreme",
      });
      expect(result.success).toBe(false);
    });

    it("accepts filter by isResolved", () => {
      const result = fraudAlertListQuerySchema.safeParse({
        isResolved: "false",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isResolved).toBe(false);
      }
    });

    it("coerces string numbers for limit and offset", () => {
      const result = fraudAlertListQuerySchema.safeParse({
        limit: "10",
        offset: "20",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(20);
      }
    });
  });
});

describe("Fraud Alert Routes", () => {
  it("GET /api/fraud-alerts requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get("/api/fraud-alerts");
    expect(res.status).toBe(401);
  });

  it("GET /api/fraud-alerts requires owner or staff role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .get("/api/fraud-alerts")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/fraud-alerts denied for tailor role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.TAILOR);
    const res = await request(app)
      .get("/api/fraud-alerts")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/fraud-alerts denied for packager role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(
      undefined,
      undefined,
      UserRole.PACKAGER,
    );
    const res = await request(app)
      .get("/api/fraud-alerts")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("PUT /api/fraud-alerts/:id/resolve requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).put(
      `/api/fraud-alerts/${crypto.randomUUID()}/resolve`,
    );
    expect(res.status).toBe(401);
  });

  it("PUT /api/fraud-alerts/:id/resolve requires owner role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.STAFF);
    const res = await request(app)
      .put(`/api/fraud-alerts/${crypto.randomUUID()}/resolve`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("PUT /api/fraud-alerts/:id/resolve denied for wager", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .put(`/api/fraud-alerts/${crypto.randomUUID()}/resolve`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });
});
