import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../../middleware/errorHandler.js";
import { UserRole } from "../../../types/enums.js";
import {
  createTenantSchema,
  updateTenantSchema,
  updateTenantStatusSchema,
  updateTenantSettingsSchema,
} from "../tenant.schema.js";

// Schema validation tests (no DB needed)
describe("Tenant Schemas", () => {
  describe("createTenantSchema", () => {
    it("accepts valid tenant data", () => {
      const result = createTenantSchema.safeParse({
        name: "Ravi Textiles",
        ownerName: "Ravi",
        phone: "+919876543210",
        stateCode: "TN",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing name", () => {
      const result = createTenantSchema.safeParse({
        ownerName: "Ravi",
        phone: "+919876543210",
        stateCode: "TN",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid phone format", () => {
      const result = createTenantSchema.safeParse({
        name: "Ravi Textiles",
        ownerName: "Ravi",
        phone: "9876543210",
        stateCode: "TN",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing stateCode", () => {
      const result = createTenantSchema.safeParse({
        name: "Ravi Textiles",
        ownerName: "Ravi",
        phone: "+919876543210",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid GSTIN", () => {
      const result = createTenantSchema.safeParse({
        name: "Ravi Textiles",
        ownerName: "Ravi",
        phone: "+919876543210",
        stateCode: "TN",
        gstin: "33AABCU9603R1ZM",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid GSTIN format", () => {
      const result = createTenantSchema.safeParse({
        name: "Ravi Textiles",
        ownerName: "Ravi",
        phone: "+919876543210",
        stateCode: "TN",
        gstin: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("allows optional email", () => {
      const result = createTenantSchema.safeParse({
        name: "Ravi Textiles",
        ownerName: "Ravi",
        phone: "+919876543210",
        stateCode: "TN",
        email: "ravi@test.com",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateTenantStatusSchema", () => {
    it("accepts valid status values", () => {
      expect(
        updateTenantStatusSchema.safeParse({ status: "active" }).success,
      ).toBe(true);
      expect(
        updateTenantStatusSchema.safeParse({ status: "suspended" }).success,
      ).toBe(true);
      expect(
        updateTenantStatusSchema.safeParse({ status: "trial" }).success,
      ).toBe(true);
    });

    it("rejects invalid status", () => {
      expect(
        updateTenantStatusSchema.safeParse({ status: "deleted" }).success,
      ).toBe(false);
    });
  });

  describe("updateTenantSettingsSchema", () => {
    it("accepts valid settings update", () => {
      const result = updateTenantSettingsSchema.safeParse({
        batchEnabled: true,
        wageCycleDay: 3,
        damageMinorDeductionPct: 30,
      });
      expect(result.success).toBe(true);
    });

    it("rejects wageCycleDay out of range", () => {
      expect(
        updateTenantSettingsSchema.safeParse({ wageCycleDay: 7 }).success,
      ).toBe(false);
      expect(
        updateTenantSettingsSchema.safeParse({ wageCycleDay: -1 }).success,
      ).toBe(false);
    });

    it("rejects damage deduction over 100%", () => {
      expect(
        updateTenantSettingsSchema.safeParse({ damageMinorDeductionPct: 150 })
          .success,
      ).toBe(false);
    });

    it("accepts all boolean flags", () => {
      const result = updateTenantSettingsSchema.safeParse({
        batchEnabled: true,
        shiftEnabled: true,
        interGodownTransferEnabled: true,
        authOtpEnabled: false,
        authPinEnabled: true,
        showWagerRanking: true,
      });
      expect(result.success).toBe(true);
    });
  });
});

// Route-level tests using supertest (mocked DB)
describe("Tenant Routes", () => {
  it("POST /api/tenants requires super admin", async () => {
    // Use the real app but without DB - authenticate will validate token
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const { getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");

    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Test",
        ownerName: "Test",
        phone: "+919876543210",
        stateCode: "TN",
      });

    expect(res.status).toBe(403);
  });

  it("GET /api/tenants requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/tenants");

    expect(res.status).toBe(401);
  });
});
