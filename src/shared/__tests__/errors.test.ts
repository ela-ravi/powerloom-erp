import { describe, it, expect } from "vitest";
import { AppError, ErrorCode } from "../errors.js";

describe("AppError", () => {
  it("creates with correct code and status", () => {
    const err = new AppError(ErrorCode.NOT_FOUND, "Not here");

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe(ErrorCode.NOT_FOUND);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not here");
  });

  it("includes details when provided", () => {
    const details = [{ field: "email", message: "Invalid" }];
    const err = AppError.validation("Bad", details);

    expect(err.details).toEqual(details);
  });

  it("maps all error codes to correct status codes", () => {
    const mapping: [ErrorCode, number][] = [
      [ErrorCode.VALIDATION_ERROR, 400],
      [ErrorCode.UNAUTHORIZED, 401],
      [ErrorCode.FORBIDDEN, 403],
      [ErrorCode.NOT_FOUND, 404],
      [ErrorCode.CONFLICT, 409],
      [ErrorCode.RATE_LIMITED, 429],
      [ErrorCode.INTERNAL_ERROR, 500],
    ];

    for (const [code, status] of mapping) {
      expect(new AppError(code, "test").statusCode).toBe(status);
    }
  });
});
