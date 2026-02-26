import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../errorHandler.js";
import { AppError, ErrorCode } from "../../shared/errors.js";

function createTestApp(error: Error) {
  const app = express();
  app.get("/test", (_req, _res, next) => next(error));
  app.use(errorHandler);
  return app;
}

describe("errorHandler middleware", () => {
  it("formats validation error as 400", async () => {
    const app = createTestApp(
      AppError.validation("Bad input", [
        { field: "name", message: "Required" },
      ]),
    );

    const res = await request(app).get("/test");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(res.body.error.message).toBe("Bad input");
    expect(res.body.error.details).toHaveLength(1);
    expect(res.body.error.details[0].field).toBe("name");
  });

  it("formats unauthorized error as 401", async () => {
    const app = createTestApp(AppError.unauthorized());
    const res = await request(app).get("/test");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it("formats forbidden error as 403", async () => {
    const app = createTestApp(AppError.forbidden());
    const res = await request(app).get("/test");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
  });

  it("formats not found error as 404", async () => {
    const app = createTestApp(AppError.notFound());
    const res = await request(app).get("/test");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.NOT_FOUND);
  });

  it("formats internal error as 500 without stack trace", async () => {
    const app = createTestApp(new Error("something broke"));
    const res = await request(app).get("/test");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(res.body.error.message).toBe("Internal server error");
    expect(res.body.error).not.toHaveProperty("stack");
  });

  it("does not include details when not provided", async () => {
    const app = createTestApp(AppError.unauthorized("No access"));
    const res = await request(app).get("/test");

    expect(res.body.error).not.toHaveProperty("details");
  });
});

describe("AppError class", () => {
  it("creates a structured error with correct properties", () => {
    const err = new AppError(ErrorCode.CONFLICT, "Duplicate entry");

    expect(err.name).toBe("AppError");
    expect(err.code).toBe(ErrorCode.CONFLICT);
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Duplicate entry");
  });

  it("supports static factory methods", () => {
    expect(AppError.validation("bad").statusCode).toBe(400);
    expect(AppError.unauthorized().statusCode).toBe(401);
    expect(AppError.forbidden().statusCode).toBe(403);
    expect(AppError.notFound().statusCode).toBe(404);
    expect(AppError.conflict("dup").statusCode).toBe(409);
    expect(AppError.rateLimited().statusCode).toBe(429);
    expect(AppError.internal().statusCode).toBe(500);
  });
});
