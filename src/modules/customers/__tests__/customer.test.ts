import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerListQuerySchema,
} from "../customer.schema.js";

describe("Customer Schemas", () => {
  describe("createCustomerSchema", () => {
    it("accepts valid customer with required fields", () => {
      const result = createCustomerSchema.safeParse({
        name: "Kumar Traders",
        stateCode: "TN",
        customerType: "wholesale_partial",
      });
      expect(result.success).toBe(true);
    });

    it("defaults creditPeriodDays to 30", () => {
      const result = createCustomerSchema.parse({
        name: "Kumar Traders",
        stateCode: "TN",
        customerType: "wholesale_partial",
      });
      expect(result.creditPeriodDays).toBe(30);
    });

    it("accepts all customer types", () => {
      for (const type of [
        "wholesale_partial",
        "wholesale_bill_to_bill",
        "retail",
      ]) {
        expect(
          createCustomerSchema.safeParse({
            name: "Test",
            stateCode: "TN",
            customerType: type,
          }).success,
        ).toBe(true);
      }
    });

    it("rejects invalid customer type", () => {
      const result = createCustomerSchema.safeParse({
        name: "Test",
        stateCode: "TN",
        customerType: "vip",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing stateCode", () => {
      const result = createCustomerSchema.safeParse({
        name: "Test",
        customerType: "retail",
      });
      expect(result.success).toBe(false);
    });

    it("rejects stateCode with wrong length", () => {
      const result = createCustomerSchema.safeParse({
        name: "Test",
        stateCode: "TNN",
        customerType: "retail",
      });
      expect(result.success).toBe(false);
    });

    it("accepts full customer data", () => {
      const result = createCustomerSchema.safeParse({
        name: "Kumar Traders",
        phone: "+919876543210",
        address: "456 Market Road, Chennai",
        stateCode: "TN",
        gstin: "33BBBBB0000B1Z5",
        customerType: "wholesale_partial",
        creditPeriodDays: 45,
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative credit period", () => {
      const result = createCustomerSchema.safeParse({
        name: "Test",
        stateCode: "TN",
        customerType: "retail",
        creditPeriodDays: -1,
      });
      expect(result.success).toBe(false);
    });

    it("accepts zero credit period", () => {
      const result = createCustomerSchema.safeParse({
        name: "Test",
        stateCode: "TN",
        customerType: "retail",
        creditPeriodDays: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateCustomerSchema", () => {
    it("accepts partial update", () => {
      const result = updateCustomerSchema.safeParse({
        creditPeriodDays: 60,
      });
      expect(result.success).toBe(true);
    });

    it("accepts isActive field", () => {
      const result = updateCustomerSchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = updateCustomerSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("customerListQuerySchema", () => {
    it("provides defaults", () => {
      const result = customerListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts customerType filter", () => {
      const result = customerListQuerySchema.parse({
        customerType: "wholesale_partial",
      });
      expect(result.customerType).toBe("wholesale_partial");
    });

    it("transforms isActive string to boolean", () => {
      const result = customerListQuerySchema.parse({ isActive: "true" });
      expect(result.isActive).toBe(true);
    });
  });
});

describe("Customer Routes", () => {
  it("POST /api/customers requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).post("/api/customers").send({
      name: "Kumar Traders",
      stateCode: "TN",
      customerType: "wholesale_partial",
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/customers returns 400 for missing stateCode", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test", customerType: "retail" }); // missing stateCode

    expect(res.status).toBe(400);
  });

  it("PUT /api/customers/:id requires master_data permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .put("/api/customers/some-id")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated" });

    expect(res.status).toBe(403);
  });

  it("GET /api/customers requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/customers");

    expect(res.status).toBe(401);
  });
});
