import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { TokenPayload } from "../types/models.js";
import type { UserRole } from "../types/enums.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function generateTokenPair(payload: {
  userId: string;
  tenantId: string;
  role: UserRole;
}): TokenPair {
  const accessToken = jwt.sign(
    { ...payload, type: "access" } satisfies TokenPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any },
  );

  const refreshToken = jwt.sign(
    { ...payload, type: "refresh" } satisfies TokenPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any },
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }
  return payload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  if (payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return payload;
}
