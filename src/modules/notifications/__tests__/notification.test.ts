import { describe, it, expect } from "vitest";
import request from "supertest";
import { notificationListQuerySchema } from "../notification.schema.js";

describe("Notification Schemas", () => {
  describe("notificationListQuerySchema", () => {
    it("accepts empty query with defaults", () => {
      const result = notificationListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("accepts filter by eventType", () => {
      const result = notificationListQuerySchema.safeParse({
        eventType: "credit_due_approaching",
      });
      expect(result.success).toBe(true);
    });

    it("accepts filter by isRead true", () => {
      const result = notificationListQuerySchema.safeParse({
        isRead: "true",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isRead).toBe(true);
      }
    });

    it("accepts filter by isRead false", () => {
      const result = notificationListQuerySchema.safeParse({
        isRead: "false",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isRead).toBe(false);
      }
    });

    it("accepts filter by priority", () => {
      for (const priority of ["low", "medium", "high", "urgent"]) {
        const result = notificationListQuerySchema.safeParse({ priority });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid priority", () => {
      const result = notificationListQuerySchema.safeParse({
        priority: "extreme",
      });
      expect(result.success).toBe(false);
    });

    it("coerces string numbers for limit and offset", () => {
      const result = notificationListQuerySchema.safeParse({
        limit: "15",
        offset: "5",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(15);
        expect(result.data.offset).toBe(5);
      }
    });
  });
});

describe("Notification Routes", () => {
  it("GET /api/notifications requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("GET /api/notifications/unread-count requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get("/api/notifications/unread-count");
    expect(res.status).toBe(401);
  });

  it("PUT /api/notifications/:id/read requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const crypto = await import("crypto");
    const res = await request(app).put(
      `/api/notifications/${crypto.randomUUID()}/read`,
    );
    expect(res.status).toBe(401);
  });

  it("PUT /api/notifications/read-all requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).put("/api/notifications/read-all");
    expect(res.status).toBe(401);
  });

  it("GET /api/notifications allows any authenticated user", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { UserRole } = await import("../../../types/enums.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${accessToken}`);
    // Should not be 401 or 403 — will be 500 since no DB
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
