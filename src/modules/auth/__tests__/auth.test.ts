import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  otpSendSchema,
  otpVerifySchema,
  pinVerifySchema,
  pinSetSchema,
  refreshTokenSchema,
} from "../auth.schema.js";

// Schema validation tests
describe("Auth Schemas", () => {
  describe("otpSendSchema", () => {
    it("accepts valid phone", () => {
      expect(otpSendSchema.safeParse({ phone: "+919876543210" }).success).toBe(
        true,
      );
    });

    it("rejects invalid phone", () => {
      expect(otpSendSchema.safeParse({ phone: "9876543210" }).success).toBe(
        false,
      );
      expect(otpSendSchema.safeParse({ phone: "" }).success).toBe(false);
      expect(otpSendSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("otpVerifySchema", () => {
    it("accepts valid phone and code", () => {
      const result = otpVerifySchema.safeParse({
        phone: "+919876543210",
        code: "123456",
      });
      expect(result.success).toBe(true);
    });

    it("rejects code != 6 chars", () => {
      expect(
        otpVerifySchema.safeParse({ phone: "+919876543210", code: "123" })
          .success,
      ).toBe(false);
      expect(
        otpVerifySchema.safeParse({ phone: "+919876543210", code: "1234567" })
          .success,
      ).toBe(false);
    });
  });

  describe("pinVerifySchema", () => {
    it("accepts valid phone and 4-digit pin", () => {
      const result = pinVerifySchema.safeParse({
        phone: "+919876543210",
        pin: "1234",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-4-digit pin", () => {
      expect(
        pinVerifySchema.safeParse({ phone: "+919876543210", pin: "123" })
          .success,
      ).toBe(false);
      expect(
        pinVerifySchema.safeParse({ phone: "+919876543210", pin: "12345" })
          .success,
      ).toBe(false);
      expect(
        pinVerifySchema.safeParse({ phone: "+919876543210", pin: "abcd" })
          .success,
      ).toBe(false);
    });
  });

  describe("pinSetSchema", () => {
    it("accepts 4-digit pin", () => {
      expect(pinSetSchema.safeParse({ pin: "5678" }).success).toBe(true);
    });

    it("rejects invalid pin", () => {
      expect(pinSetSchema.safeParse({ pin: "12" }).success).toBe(false);
    });
  });

  describe("refreshTokenSchema", () => {
    it("accepts non-empty string", () => {
      expect(
        refreshTokenSchema.safeParse({ refreshToken: "some-token" }).success,
      ).toBe(true);
    });

    it("rejects empty string", () => {
      expect(refreshTokenSchema.safeParse({ refreshToken: "" }).success).toBe(
        false,
      );
    });
  });
});

// Route-level auth tests
describe("Auth Routes", () => {
  it("POST /api/auth/otp/send returns 400 for invalid phone", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app)
      .post("/api/auth/otp/send")
      .send({ phone: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/auth/otp/verify returns 400 for invalid code", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app)
      .post("/api/auth/otp/verify")
      .send({ phone: "+919876543210", code: "12" });

    expect(res.status).toBe(400);
  });

  it("POST /api/auth/pin/verify returns 400 for invalid pin format", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app)
      .post("/api/auth/pin/verify")
      .send({ phone: "+919876543210", pin: "abc" });

    expect(res.status).toBe(400);
  });

  it("PUT /api/auth/pin requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).put("/api/auth/pin").send({ pin: "1234" });

    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
  });

  it("POST /api/auth/refresh returns 400 for empty token", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "" });

    expect(res.status).toBe(400);
  });
});
