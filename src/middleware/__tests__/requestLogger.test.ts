import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import { requestLogger } from "../requestLogger.js";

// Mock the logger
vi.mock("../../config/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const { logger } = await import("../../config/logger.js");

describe("requestLogger middleware", () => {
  it("logs method, path, status code, and duration", async () => {
    const app = express();
    app.use(requestLogger);
    app.get("/test", (_req, res) => res.json({ ok: true }));

    await request(app).get("/test");

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        path: "/test",
        statusCode: 200,
        duration: expect.any(Number),
      }),
    );
  });

  it("does not log Authorization header value", async () => {
    const app = express();
    app.use(requestLogger);
    app.get("/test", (_req, res) => res.json({ ok: true }));

    await request(app).get("/test").set("Authorization", "Bearer secret-token");

    const logCall = (logger.info as any).mock.calls[0][0];
    expect(JSON.stringify(logCall)).not.toContain("secret-token");
  });
});
