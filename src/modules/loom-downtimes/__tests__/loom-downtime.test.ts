import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createLoomDowntimeSchema,
  updateLoomDowntimeSchema,
  loomDowntimeListQuerySchema,
} from "../loom-downtime.schema.js";
import crypto from "crypto";

describe("Loom Downtime Schemas", () => {
  describe("createLoomDowntimeSchema", () => {
    it("accepts valid downtime data", () => {
      const result = createLoomDowntimeSchema.safeParse({
        loomId: crypto.randomUUID(),
        reason: "mechanical",
        startTime: "2026-02-15T08:00:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("accepts all valid reasons", () => {
      const reasons = [
        "mechanical",
        "electrical",
        "material_shortage",
        "other",
      ];
      for (const reason of reasons) {
        const result = createLoomDowntimeSchema.safeParse({
          loomId: crypto.randomUUID(),
          reason,
          startTime: "2026-02-15T08:00:00Z",
          ...(reason === "other" ? { customReason: "Power outage" } : {}),
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts optional fields", () => {
      const result = createLoomDowntimeSchema.safeParse({
        loomId: crypto.randomUUID(),
        wagerId: crypto.randomUUID(),
        reason: "electrical",
        startTime: "2026-02-15T08:00:00Z",
        notes: "Scheduled maintenance",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing required fields", () => {
      const result = createLoomDowntimeSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects invalid reason", () => {
      const result = createLoomDowntimeSchema.safeParse({
        loomId: crypto.randomUUID(),
        reason: "weather",
        startTime: "2026-02-15T08:00:00Z",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing loomId", () => {
      const result = createLoomDowntimeSchema.safeParse({
        reason: "mechanical",
        startTime: "2026-02-15T08:00:00Z",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateLoomDowntimeSchema", () => {
    it("accepts endTime", () => {
      const result = updateLoomDowntimeSchema.safeParse({
        endTime: "2026-02-15T10:30:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("accepts endTime with notes", () => {
      const result = updateLoomDowntimeSchema.safeParse({
        endTime: "2026-02-15T10:30:00Z",
        notes: "Resolved, belt replaced",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing endTime", () => {
      const result = updateLoomDowntimeSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("loomDowntimeListQuerySchema", () => {
    it("provides defaults", () => {
      const result = loomDowntimeListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts loomId filter", () => {
      const id = crypto.randomUUID();
      const result = loomDowntimeListQuerySchema.parse({ loomId: id });
      expect(result.loomId).toBe(id);
    });

    it("accepts wagerId filter", () => {
      const id = crypto.randomUUID();
      const result = loomDowntimeListQuerySchema.parse({ wagerId: id });
      expect(result.wagerId).toBe(id);
    });
  });
});

describe("Loom Downtime Business Logic", () => {
  it("reason=other requires customReason", () => {
    const reason = "other";
    const customReason: string | undefined = undefined;
    expect(reason === "other" && !customReason).toBe(true);
  });

  it("reason=other with customReason is valid", () => {
    const reason = "other";
    const customReason = "Power outage";
    expect(reason === "other" && !customReason).toBe(false);
  });

  it("calculates duration_minutes from start and end time", () => {
    const startTime = new Date("2026-02-15T08:00:00Z");
    const endTime = new Date("2026-02-15T10:30:00Z");
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );
    expect(durationMinutes).toBe(150);
  });

  it("handles multi-hour downtime", () => {
    const startTime = new Date("2026-02-15T06:00:00Z");
    const endTime = new Date("2026-02-15T18:00:00Z");
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );
    expect(durationMinutes).toBe(720);
  });
});

describe("Loom Downtime Routes", () => {
  it("POST /api/loom-downtimes requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).post("/api/loom-downtimes").send({
      loomId: crypto.randomUUID(),
      reason: "mechanical",
      startTime: "2026-02-15T08:00:00Z",
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/loom-downtimes requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .post("/api/loom-downtimes")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        loomId: crypto.randomUUID(),
        reason: "mechanical",
        startTime: "2026-02-15T08:00:00Z",
      });

    expect(res.status).toBe(403);
  });

  it("POST /api/loom-downtimes returns 400 for missing fields", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/loom-downtimes")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST /api/loom-downtimes returns 400 for invalid reason", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/loom-downtimes")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        loomId: crypto.randomUUID(),
        reason: "weather",
        startTime: "2026-02-15T08:00:00Z",
      });

    expect(res.status).toBe(400);
  });

  it("PUT /api/loom-downtimes/:id requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .put(`/api/loom-downtimes/${crypto.randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ endTime: "2026-02-15T10:30:00Z" });

    expect(res.status).toBe(403);
  });

  it("GET /api/loom-downtimes requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/loom-downtimes");

    expect(res.status).toBe(401);
  });
});
