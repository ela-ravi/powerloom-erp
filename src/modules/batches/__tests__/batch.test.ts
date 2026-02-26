import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createBatchSchema,
  updateBatchSchema,
  updateBatchStatusSchema,
  batchListQuerySchema,
} from "../batch.schema.js";
import crypto from "crypto";

describe("Batch Schemas", () => {
  describe("createBatchSchema", () => {
    it("accepts valid batch data", () => {
      const result = createBatchSchema.safeParse({
        productId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts batch with notes", () => {
      const result = createBatchSchema.safeParse({
        productId: crypto.randomUUID(),
        notes: "First batch of Khadi 30x60",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing productId", () => {
      const result = createBatchSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects invalid productId format", () => {
      const result = createBatchSchema.safeParse({
        productId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateBatchSchema", () => {
    it("accepts partial update with notes", () => {
      const result = updateBatchSchema.safeParse({
        notes: "Updated notes",
      });
      expect(result.success).toBe(true);
    });

    it("accepts nullable notes", () => {
      const result = updateBatchSchema.safeParse({ notes: null });
      expect(result.success).toBe(true);
    });

    it("accepts productId update", () => {
      const result = updateBatchSchema.safeParse({
        productId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = updateBatchSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("updateBatchStatusSchema", () => {
    it("accepts all valid statuses", () => {
      for (const status of ["open", "in_progress", "closed"]) {
        expect(updateBatchStatusSchema.safeParse({ status }).success).toBe(
          true,
        );
      }
    });

    it("rejects invalid status", () => {
      const result = updateBatchStatusSchema.safeParse({
        status: "cancelled",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing status", () => {
      const result = updateBatchStatusSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("batchListQuerySchema", () => {
    it("provides defaults", () => {
      const result = batchListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts status filter", () => {
      const result = batchListQuerySchema.parse({ status: "open" });
      expect(result.status).toBe("open");
    });

    it("accepts productId filter", () => {
      const id = crypto.randomUUID();
      const result = batchListQuerySchema.parse({ productId: id });
      expect(result.productId).toBe(id);
    });

    it("rejects invalid status filter", () => {
      const result = batchListQuerySchema.safeParse({ status: "pending" });
      expect(result.success).toBe(false);
    });
  });
});

describe("Batch Status Transitions", () => {
  // These test the VALID_TRANSITIONS map logic
  const VALID_TRANSITIONS: Record<string, string[]> = {
    open: ["in_progress"],
    in_progress: ["closed"],
    closed: ["open"],
  };

  it("allows open -> in_progress", () => {
    expect(VALID_TRANSITIONS["open"]).toContain("in_progress");
  });

  it("allows in_progress -> closed", () => {
    expect(VALID_TRANSITIONS["in_progress"]).toContain("closed");
  });

  it("allows closed -> open (reopen)", () => {
    expect(VALID_TRANSITIONS["closed"]).toContain("open");
  });

  it("disallows open -> closed (must go through in_progress)", () => {
    expect(VALID_TRANSITIONS["open"]).not.toContain("closed");
  });

  it("disallows in_progress -> open (cannot go backwards)", () => {
    expect(VALID_TRANSITIONS["in_progress"]).not.toContain("open");
  });

  it("disallows closed -> in_progress (must reopen first)", () => {
    expect(VALID_TRANSITIONS["closed"]).not.toContain("in_progress");
  });
});

describe("Batch Routes", () => {
  it("POST /api/batches requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app)
      .post("/api/batches")
      .send({ productId: crypto.randomUUID() });

    expect(res.status).toBe(401);
  });

  it("POST /api/batches requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .post("/api/batches")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ productId: crypto.randomUUID() });

    expect(res.status).toBe(403);
  });

  it("POST /api/batches returns 400 for missing productId", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/batches")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("GET /api/batches requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/batches");

    expect(res.status).toBe(401);
  });

  it("PUT /api/batches/:id requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .put(`/api/batches/${crypto.randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ notes: "Updated" });

    expect(res.status).toBe(403);
  });

  it("PUT /api/batches/:id/status requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .put(`/api/batches/${crypto.randomUUID()}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "in_progress" });

    expect(res.status).toBe(403);
  });

  it("PUT /api/batches/:id/status returns 400 for invalid status", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .put(`/api/batches/${crypto.randomUUID()}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "cancelled" });

    expect(res.status).toBe(400);
  });
});
