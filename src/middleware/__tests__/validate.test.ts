import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { z } from "zod";
import { validate } from "../validate.js";
import { errorHandler } from "../errorHandler.js";

function createTestApp(schemas: Parameters<typeof validate>[0]) {
  const app = express();
  app.use(express.json());
  app.post("/test", validate(schemas), (_req, res) => {
    res.json({ data: { body: _req.body, query: _req.query } });
  });
  app.get("/test", validate(schemas), (_req, res) => {
    res.json({ data: { query: _req.query } });
  });
  app.use(errorHandler);
  return app;
}

describe("validate middleware", () => {
  it("passes valid request body through", async () => {
    const app = createTestApp({
      body: z.object({ name: z.string() }),
    });

    const res = await request(app).post("/test").send({ name: "Test" });

    expect(res.status).toBe(200);
    expect(res.body.data.body.name).toBe("Test");
  });

  it("returns 400 for invalid body with field-level details", async () => {
    const app = createTestApp({
      body: z.object({ name: z.string(), age: z.number() }),
    });

    const res = await request(app).post("/test").send({ name: 123 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it("validates query params", async () => {
    const app = createTestApp({
      query: z.object({ page: z.coerce.number().int().positive() }),
    });

    const res = await request(app).get("/test?page=5");

    expect(res.status).toBe(200);
    expect(res.body.data.query.page).toBe(5);
  });

  it("returns 400 for invalid query params", async () => {
    const app = createTestApp({
      query: z.object({ page: z.coerce.number().int().positive() }),
    });

    const res = await request(app).get("/test?page=-1");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("strips unknown fields in strict mode", async () => {
    const app = createTestApp({
      body: z.object({ name: z.string() }).strict(),
    });

    const res = await request(app)
      .post("/test")
      .send({ name: "Test", extra: "field" });

    expect(res.status).toBe(400);
  });
});
