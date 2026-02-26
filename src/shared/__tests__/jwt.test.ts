import { describe, it, expect } from "vitest";
import {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
} from "../jwt.js";
import { UserRole } from "../../types/enums.js";
import jwt from "jsonwebtoken";

describe("JWT utilities", () => {
  const payload = {
    userId: "user-1",
    tenantId: "tenant-1",
    role: UserRole.OWNER,
  };

  it("generates access and refresh tokens", () => {
    const tokens = generateTokenPair(payload);

    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(tokens.accessToken).not.toBe(tokens.refreshToken);
  });

  it("access token contains correct claims", () => {
    const { accessToken } = generateTokenPair(payload);
    const decoded = verifyAccessToken(accessToken);

    expect(decoded.userId).toBe("user-1");
    expect(decoded.tenantId).toBe("tenant-1");
    expect(decoded.role).toBe(UserRole.OWNER);
    expect(decoded.type).toBe("access");
  });

  it("refresh token contains correct claims", () => {
    const { refreshToken } = generateTokenPair(payload);
    const decoded = verifyRefreshToken(refreshToken);

    expect(decoded.userId).toBe("user-1");
    expect(decoded.tenantId).toBe("tenant-1");
    expect(decoded.role).toBe(UserRole.OWNER);
    expect(decoded.type).toBe("refresh");
  });

  it("rejects access token when used as refresh", () => {
    const { accessToken } = generateTokenPair(payload);

    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });

  it("rejects refresh token when used as access", () => {
    const { refreshToken } = generateTokenPair(payload);

    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });

  it("rejects expired tokens", () => {
    const token = jwt.sign(
      { ...payload, type: "access" },
      process.env.JWT_SECRET!,
      { expiresIn: "0s" },
    );

    expect(() => verifyAccessToken(token)).toThrow();
  });
});
