export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

const STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Array<{ field: string; message: string }>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = STATUS_MAP[code];
    this.details = details;
  }

  static validation(
    message: string,
    details?: Array<{ field: string; message: string }>,
  ): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message = "Unauthorized access"): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message);
  }

  static forbidden(message = "Access denied"): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(ErrorCode.NOT_FOUND, message);
  }

  static conflict(message: string): AppError {
    return new AppError(ErrorCode.CONFLICT, message);
  }

  static rateLimited(message = "Too many requests"): AppError {
    return new AppError(ErrorCode.RATE_LIMITED, message);
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message);
  }
}
