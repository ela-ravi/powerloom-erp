import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { authenticate } from "../authenticate.js";
import { errorHandler } from "../errorHandler.js";
import { generateTokenPair } from "../../shared/jwt.js";
import { UserRole } from "../../types/enums.js";
import jwt from "jsonwebtoken";

function createTestApp() {
  const app = express();
  app.get("/test", authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });
  app.use(errorHandler);
  return app;
}

describe("authenticate middleware", () => {
  const testApp = createTestApp();

  it("returns 401 without Authorization header", async () => {
    const res = await request(testApp).get("/test");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 with malformed token", async () => {
    const res = await request(testApp)
      .get("/test")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
  });

  it("returns 401 with expired token", async () => {
    const token = jwt.sign(
      { userId: "u1", tenantId: "t1", role: "owner", type: "access" },
      process.env.JWT_SECRET!,
      { expiresIn: "0s" },
    );

    // Wait a moment for expiry
    await new Promise((r) => setTimeout(r, 10));

    const res = await request(testApp)
      .get("/test")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it("sets req.user with valid token", async () => {
    const { accessToken } = generateTokenPair({
      userId: "user-123",
      tenantId: "tenant-456",
      role: UserRole.OWNER,
    });

    const res = await request(testApp)
      .get("/test")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: "user-123",
      tenantId: "tenant-456",
      role: "owner",
    });
  });

  it("rejects refresh tokens used as access tokens", async () => {
    const { refreshToken } = generateTokenPair({
      userId: "user-123",
      tenantId: "tenant-456",
      role: UserRole.OWNER,
    });

    const res = await request(testApp)
      .get("/test")
      .set("Authorization", `Bearer ${refreshToken}`);

    expect(res.status).toBe(401);
  });

  it("returns 401 without Bearer prefix", async () => {
    const res = await request(testApp)
      .get("/test")
      .set("Authorization", "token-without-bearer");

    expect(res.status).toBe(401);
  });
});
