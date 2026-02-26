import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../tests/utils/test-helpers.js";

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("returns a valid ISO timestamp", async () => {
    const res = await request(app).get("/api/health");

    const ts = new Date(res.body.timestamp);
    expect(ts.toISOString()).toBe(res.body.timestamp);
  });
});
