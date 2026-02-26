import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierListQuerySchema,
} from "../supplier.schema.js";

describe("Supplier Schemas", () => {
  describe("createSupplierSchema", () => {
    it("accepts valid supplier with name only", () => {
      const result = createSupplierSchema.safeParse({
        name: "Lakshmi Cotton Mills",
      });
      expect(result.success).toBe(true);
    });

    it("accepts full supplier data", () => {
      const result = createSupplierSchema.safeParse({
        name: "Lakshmi Cotton Mills",
        phone: "+919876543210",
        address: "123 Mill Road, Erode",
        gstin: "33AAAAA0000A1Z5",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing name", () => {
      const result = createSupplierSchema.safeParse({
        phone: "+919876543210",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid phone format", () => {
      const result = createSupplierSchema.safeParse({
        name: "Test",
        phone: "123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createSupplierSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("updateSupplierSchema", () => {
    it("accepts partial update", () => {
      const result = updateSupplierSchema.safeParse({
        name: "Updated Mill Name",
      });
      expect(result.success).toBe(true);
    });

    it("accepts isActive field", () => {
      const result = updateSupplierSchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    it("accepts nullable fields", () => {
      const result = updateSupplierSchema.safeParse({
        phone: null,
        address: null,
        gstin: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = updateSupplierSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("supplierListQuerySchema", () => {
    it("provides defaults", () => {
      const result = supplierListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("transforms isActive string to boolean", () => {
      const result = supplierListQuerySchema.parse({ isActive: "false" });
      expect(result.isActive).toBe(false);
    });
  });
});

describe("Supplier Routes", () => {
  it("POST /api/suppliers requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app)
      .post("/api/suppliers")
      .send({ name: "Lakshmi Cotton Mills" });

    expect(res.status).toBe(401);
  });

  it("POST /api/suppliers returns 400 for invalid body", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/suppliers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({}); // missing name

    expect(res.status).toBe(400);
  });

  it("PUT /api/suppliers/:id requires master_data permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .put("/api/suppliers/some-id")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated" });

    expect(res.status).toBe(403);
  });

  it("GET /api/suppliers requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/suppliers");

    expect(res.status).toBe(401);
  });
});
