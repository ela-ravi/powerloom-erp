import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { authorize } from "../authorize.js";
import { errorHandler } from "../errorHandler.js";
import { UserRole } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";

function createTestApp(...allowedRoles: UserRole[]) {
  const app = express();
  // Simulate pre-authenticated request
  app.use((req: any, _res, next) => {
    req.user = JSON.parse((req.headers["x-test-user"] as string) || "null");
    next();
  });
  app.get("/test", authorize(...allowedRoles), (_req, res) => {
    res.json({ success: true });
  });
  app.use(errorHandler);
  return app;
}

const makeUser = (role: UserRole, id = "u1", tenantId = "t1") =>
  JSON.stringify({ id, tenantId, role });

describe("authorize middleware", () => {
  it("allows owner to access owner-only routes", async () => {
    const app = createTestApp(UserRole.OWNER);

    const res = await request(app)
      .get("/test")
      .set("X-Test-User", makeUser(UserRole.OWNER));

    expect(res.status).toBe(200);
  });

  it("denies wager from owner-only routes", async () => {
    const app = createTestApp(UserRole.OWNER);

    const res = await request(app)
      .get("/test")
      .set("X-Test-User", makeUser(UserRole.WAGER));

    expect(res.status).toBe(403);
  });

  it("allows multiple roles", async () => {
    const app = createTestApp(UserRole.OWNER, UserRole.STAFF);

    const resOwner = await request(app)
      .get("/test")
      .set("X-Test-User", makeUser(UserRole.OWNER));
    expect(resOwner.status).toBe(200);

    const resStaff = await request(app)
      .get("/test")
      .set("X-Test-User", makeUser(UserRole.STAFF));
    expect(resStaff.status).toBe(200);
  });

  it("super admin always has access", async () => {
    const app = createTestApp(UserRole.OWNER);

    const res = await request(app)
      .get("/test")
      .set("X-Test-User", makeUser(UserRole.SUPER_ADMIN));

    expect(res.status).toBe(200);
  });

  it("returns 401 when no user is present", async () => {
    const app = createTestApp(UserRole.OWNER);

    const res = await request(app).get("/test");

    expect(res.status).toBe(401);
  });
});
