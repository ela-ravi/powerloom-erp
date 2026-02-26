import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../shared/jwt.js";
import { AppError } from "../shared/errors.js";
import type { AuthenticatedRequest } from "../types/api.js";

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(AppError.unauthorized("Missing or invalid authorization header"));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = {
      id: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    };
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired token"));
  }
}
