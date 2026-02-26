import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createUserSchema,
  updateUserSchema,
  setPermissionsSchema,
  userListQuerySchema,
} from "../user.schema.js";

// Schema validation tests
describe("User Schemas", () => {
  describe("createUserSchema", () => {
    it("accepts valid user data", () => {
      const result = createUserSchema.safeParse({
        phone: "+919876543210",
        name: "Muthu",
        role: "wager",
      });
      expect(result.success).toBe(true);
    });

    it("rejects super_admin role in creation", () => {
      const result = createUserSchema.safeParse({
        phone: "+919876543210",
        name: "Admin",
        role: "super_admin",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid roles", () => {
      for (const role of ["owner", "staff", "wager", "tailor", "packager"]) {
        expect(
          createUserSchema.safeParse({
            phone: "+919876543210",
            name: "Test",
            role,
          }).success,
        ).toBe(true);
      }
    });

    it("defaults language to en", () => {
      const result = createUserSchema.parse({
        phone: "+919876543210",
        name: "Test",
        role: "staff",
      });
      expect(result.language).toBe("en");
    });

    it("rejects missing name", () => {
      expect(
        createUserSchema.safeParse({
          phone: "+919876543210",
          role: "wager",
        }).success,
      ).toBe(false);
    });
  });

  describe("setPermissionsSchema", () => {
    it("accepts valid permissions array", () => {
      const result = setPermissionsSchema.safeParse({
        permissions: ["production_entry", "godown_management"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid permission values", () => {
      const result = setPermissionsSchema.safeParse({
        permissions: ["invalid_permission"],
      });
      expect(result.success).toBe(false);
    });

    it("accepts empty permissions array", () => {
      const result = setPermissionsSchema.safeParse({ permissions: [] });
      expect(result.success).toBe(true);
    });

    it("accepts all valid permission values", () => {
      const result = setPermissionsSchema.safeParse({
        permissions: [
          "godown_management",
          "production_entry",
          "wage_processing",
          "sales_invoicing",
          "reports",
          "damage_approval",
          "master_data",
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("userListQuerySchema", () => {
    it("provides defaults", () => {
      const result = userListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts role filter", () => {
      const result = userListQuerySchema.parse({ role: "wager" });
      expect(result.role).toBe("wager");
    });

    it("transforms isActive string to boolean", () => {
      const result = userListQuerySchema.parse({ isActive: "true" });
      expect(result.isActive).toBe(true);
    });
  });
});

// Route-level tests
describe("User Routes", () => {
  it("POST /api/users requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app)
      .post("/api/users")
      .send({ phone: "+919876543210", name: "Test", role: "wager" });

    expect(res.status).toBe(401);
  });

  it("GET /api/users requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/users");

    expect(res.status).toBe(401);
  });

  it("PUT /api/users/:id/deactivate requires owner role", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");

    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .put("/api/users/some-id/deactivate")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it("POST /api/users returns 400 for invalid body", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");

    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test" }); // missing phone and role

    expect(res.status).toBe(400);
  });
});
