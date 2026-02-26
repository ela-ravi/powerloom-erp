import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createLoomSchema,
  updateLoomSchema,
  assignWagerSchema,
  loomListQuerySchema,
} from "../loom.schema.js";
import crypto from "crypto";

describe("Loom Schemas", () => {
  describe("createLoomSchema", () => {
    it("accepts valid loom data", () => {
      const result = createLoomSchema.safeParse({
        loomTypeId: crypto.randomUUID(),
        loomNumber: "L-001",
        ownership: "owner",
      });
      expect(result.success).toBe(true);
    });

    it("defaults maintenanceStatus to operational", () => {
      const result = createLoomSchema.parse({
        loomTypeId: crypto.randomUUID(),
        loomNumber: "L-001",
        ownership: "owner",
      });
      expect(result.maintenanceStatus).toBe("operational");
    });

    it("accepts all ownership values", () => {
      for (const ownership of ["owner", "wager"]) {
        expect(
          createLoomSchema.safeParse({
            loomTypeId: crypto.randomUUID(),
            loomNumber: "L-001",
            ownership,
          }).success,
        ).toBe(true);
      }
    });

    it("accepts all maintenance statuses", () => {
      for (const status of ["operational", "under_maintenance", "idle"]) {
        expect(
          createLoomSchema.safeParse({
            loomTypeId: crypto.randomUUID(),
            loomNumber: "L-001",
            ownership: "owner",
            maintenanceStatus: status,
          }).success,
        ).toBe(true);
      }
    });

    it("rejects invalid ownership", () => {
      const result = createLoomSchema.safeParse({
        loomTypeId: crypto.randomUUID(),
        loomNumber: "L-001",
        ownership: "renter",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing loom number", () => {
      const result = createLoomSchema.safeParse({
        loomTypeId: crypto.randomUUID(),
        ownership: "owner",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid loomTypeId format", () => {
      const result = createLoomSchema.safeParse({
        loomTypeId: "not-a-uuid",
        loomNumber: "L-001",
        ownership: "owner",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional assignedWagerId", () => {
      const result = createLoomSchema.safeParse({
        loomTypeId: crypto.randomUUID(),
        loomNumber: "L-001",
        ownership: "owner",
        assignedWagerId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("assignWagerSchema", () => {
    it("accepts valid wager id", () => {
      const result = assignWagerSchema.safeParse({
        wagerId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts null to unassign", () => {
      const result = assignWagerSchema.safeParse({ wagerId: null });
      expect(result.success).toBe(true);
    });

    it("rejects invalid uuid", () => {
      const result = assignWagerSchema.safeParse({ wagerId: "not-a-uuid" });
      expect(result.success).toBe(false);
    });
  });

  describe("loomListQuerySchema", () => {
    it("provides defaults", () => {
      const result = loomListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts filter parameters", () => {
      const result = loomListQuerySchema.parse({
        loomTypeId: crypto.randomUUID(),
        maintenanceStatus: "idle",
        isActive: "false",
      });
      expect(result.maintenanceStatus).toBe("idle");
      expect(result.isActive).toBe(false);
    });
  });
});

describe("Loom Routes", () => {
  it("POST /api/looms requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).post("/api/looms").send({
      loomTypeId: crypto.randomUUID(),
      loomNumber: "L-001",
      ownership: "owner",
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/looms returns 400 for invalid body", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/looms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ loomNumber: "L-001" }); // missing loomTypeId and ownership

    expect(res.status).toBe(400);
  });

  it("PUT /api/looms/:id/assign requires master_data permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .put("/api/looms/some-id/assign")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ wagerId: crypto.randomUUID() });

    expect(res.status).toBe(403);
  });

  it("GET /api/looms requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/looms");

    expect(res.status).toBe(401);
  });
});
