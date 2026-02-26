import type { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "../shared/errors.js";
import { logger } from "../config/logger.js";
import type { ApiErrorResponse } from "../types/api.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  logger.error({ err }, "Unhandled error");

  const isDev = process.env.NODE_ENV !== "production";
  const response: ApiErrorResponse = {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: isDev ? err.message : "Internal server error",
    },
  };
  res.status(500).json(response);
}
