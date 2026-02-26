import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../errorHandler.js";
import { UserRole } from "../../types/enums.js";

// Mock the database module
vi.mock("../../config/database.js", () => {
  const mockSql = Object.assign(async (...args: any[]) => [], {
    begin: vi.fn(),
    end: vi.fn(),
    unsafe: vi.fn(),
  });
  return {
    db: {},
    sql: mockSql,
    closeDatabase: vi.fn(),
  };
});

// Import after mock is set up
const { tenantScope } = await import("../tenantScope.js");

function createTestApp() {
  const app = express();
  app.use((req: any, _res, next) => {
    const header = req.headers["x-test-user"];
    if (header) req.user = JSON.parse(header as string);
    next();
  });
  app.get("/test", tenantScope, (req: any, res) => {
    res.json({ tenantId: req.user?.tenantId });
  });
  app.use(errorHandler);
  return app;
}

const makeUser = (role: UserRole, tenantId = "t1") =>
  JSON.stringify({ id: "u1", tenantId, role });

describe("tenantScope middleware", () => {
  const testApp = createTestApp();

  it("sets tenant context from authenticated user", async () => {
    const res = await request(testApp)
      .get("/test")
      .set("X-Test-User", makeUser(UserRole.OWNER, "tenant-abc"));

    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe("tenant-abc");
  });

  it("super admin can override tenant via X-Tenant-Id header", async () => {
    const res = await request(testApp)
      .get("/test")
      .set("X-Test-User", makeUser(UserRole.SUPER_ADMIN, "admin-tenant"))
      .set("X-Tenant-Id", "override-tenant");

    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe("override-tenant");
  });

  it("non-super-admin cannot override tenant via header", async () => {
    const res = await request(testApp)
      .get("/test")
      .set("X-Test-User", makeUser(UserRole.OWNER, "my-tenant"))
      .set("X-Tenant-Id", "other-tenant");

    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe("my-tenant");
  });

  it("returns 500 when no user context", async () => {
    const res = await request(testApp).get("/test");

    expect(res.status).toBe(500);
  });
});
