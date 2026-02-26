import { describe, it, expect, afterEach } from "vitest";
import {
  api,
  tokens,
  adminDb,
  closeAdminDb,
  T1_OWNER_ID,
  TENANT1_ID,
} from "../setup/helpers.js";
import {
  getSmsService,
  type MockSmsService,
} from "../../../src/shared/sms/sms.interface.js";

const OWNER_PHONE = "+919876543210"; // Ravi Kumar

describe("01 — Auth Flow", () => {
  afterEach(async () => {
    // Clean up OTP codes between tests
    await adminDb()`TRUNCATE otp_codes`;
  });

  // ── OTP Send ─────────────────────────────────────────────────────
  it("POST /api/auth/otp/send — sends OTP to registered phone", async () => {
    const res = await api()
      .post("/api/auth/otp/send")
      .send({ phone: OWNER_PHONE });
    expect(res.status).toBe(200);
    expect(res.body.data.message).toBeDefined();
  });

  it("POST /api/auth/otp/send — returns 404 for unregistered phone", async () => {
    const res = await api()
      .post("/api/auth/otp/send")
      .send({ phone: "+910000000000" });
    expect(res.status).toBe(404);
  });

  // ── OTP Verify ───────────────────────────────────────────────────
  it("POST /api/auth/otp/verify — correct OTP returns tokens + user", async () => {
    // Send OTP
    await api().post("/api/auth/otp/send").send({ phone: OWNER_PHONE });
    const mockSms = getSmsService() as MockSmsService;
    const code = mockSms.lastSentCode!;

    // Verify OTP
    const res = await api()
      .post("/api/auth/otp/verify")
      .send({ phone: OWNER_PHONE, code });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.id).toBe(T1_OWNER_ID);
    expect(res.body.data.user.role).toBe("owner");
    expect(res.body.data.featureFlags).toBeDefined();
  });

  it("POST /api/auth/otp/verify — wrong OTP returns 401", async () => {
    await api().post("/api/auth/otp/send").send({ phone: OWNER_PHONE });

    const res = await api()
      .post("/api/auth/otp/verify")
      .send({ phone: OWNER_PHONE, code: "000000" });

    expect(res.status).toBe(401);
  });

  // ── Rate Limiting ────────────────────────────────────────────────
  it("POST /api/auth/otp/send — rate limits after 5 requests", async () => {
    // Send 5 OTPs (the limit)
    for (let i = 0; i < 5; i++) {
      await api().post("/api/auth/otp/send").send({ phone: OWNER_PHONE });
    }
    // 6th should be rate limited
    const res = await api()
      .post("/api/auth/otp/send")
      .send({ phone: OWNER_PHONE });
    expect(res.status).toBe(429);
  });

  // ── PIN Set & Verify ─────────────────────────────────────────────
  it("PUT /api/auth/pin — sets PIN for authenticated user", async () => {
    const res = await api(tokens.t1Owner)
      .put("/api/auth/pin")
      .send({ pin: "1234" });

    expect(res.status).toBe(200);
  });

  it("POST /api/auth/pin/verify — correct PIN returns tokens", async () => {
    // First set PIN
    await api(tokens.t1Owner).put("/api/auth/pin").send({ pin: "5678" });

    // Then verify it
    const res = await api()
      .post("/api/auth/pin/verify")
      .send({ phone: OWNER_PHONE, pin: "5678" });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  // ── Token Refresh ────────────────────────────────────────────────
  it("POST /api/auth/refresh — returns new token pair", async () => {
    // Get a refresh token via OTP
    await api().post("/api/auth/otp/send").send({ phone: OWNER_PHONE });
    const mockSms = getSmsService() as MockSmsService;
    const code = mockSms.lastSentCode!;

    const verifyRes = await api()
      .post("/api/auth/otp/verify")
      .send({ phone: OWNER_PHONE, code });

    const refreshToken = verifyRes.body.data.refreshToken;

    const res = await api().post("/api/auth/refresh").send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  // ── Get Me ───────────────────────────────────────────────────────
  it("GET /api/auth/me — returns user profile with feature flags", async () => {
    const res = await api(tokens.t1Owner).get("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(T1_OWNER_ID);
    expect(res.body.data.user.tenantId).toBe(TENANT1_ID);
    expect(res.body.data.featureFlags).toBeDefined();
    expect(res.body.data.featureFlags.batchEnabled).toBe(true); // T1 has batch enabled
  });

  it("GET /api/auth/me — 401 without token", async () => {
    const res = await api().get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
