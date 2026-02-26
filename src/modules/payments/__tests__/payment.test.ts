import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createPaymentSchema,
  paymentListQuerySchema,
} from "../payment.schema.js";
import crypto from "crypto";

describe("Payment Schemas", () => {
  describe("createPaymentSchema", () => {
    it("accepts valid payment data", () => {
      const result = createPaymentSchema.safeParse({
        invoiceId: crypto.randomUUID(),
        amount: 5000,
        paymentMethod: "cash",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing invoiceId", () => {
      const result = createPaymentSchema.safeParse({
        amount: 5000,
        paymentMethod: "cash",
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero amount", () => {
      const result = createPaymentSchema.safeParse({
        invoiceId: crypto.randomUUID(),
        amount: 0,
        paymentMethod: "cash",
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative amount", () => {
      const result = createPaymentSchema.safeParse({
        invoiceId: crypto.randomUUID(),
        amount: -100,
        paymentMethod: "upi",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid payment methods", () => {
      for (const method of [
        "cash",
        "upi",
        "bank_transfer",
        "cheque",
        "other",
      ]) {
        const result = createPaymentSchema.safeParse({
          invoiceId: crypto.randomUUID(),
          amount: 1000,
          paymentMethod: method,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid payment method", () => {
      const result = createPaymentSchema.safeParse({
        invoiceId: crypto.randomUUID(),
        amount: 1000,
        paymentMethod: "bitcoin",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional referenceNumber", () => {
      const result = createPaymentSchema.safeParse({
        invoiceId: crypto.randomUUID(),
        amount: 5000,
        paymentMethod: "cheque",
        referenceNumber: "CHQ-12345",
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional paymentDate", () => {
      const result = createPaymentSchema.safeParse({
        invoiceId: crypto.randomUUID(),
        amount: 5000,
        paymentMethod: "bank_transfer",
        paymentDate: "2026-02-15",
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional notes", () => {
      const result = createPaymentSchema.safeParse({
        invoiceId: crypto.randomUUID(),
        amount: 3000,
        paymentMethod: "upi",
        notes: "Partial payment for February order",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing paymentMethod", () => {
      const result = createPaymentSchema.safeParse({
        invoiceId: crypto.randomUUID(),
        amount: 5000,
      });
      expect(result.success).toBe(false);
    });

    it("accepts decimal amounts", () => {
      const result = createPaymentSchema.safeParse({
        invoiceId: crypto.randomUUID(),
        amount: 2500.5,
        paymentMethod: "cash",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("paymentListQuerySchema", () => {
    it("accepts empty query with defaults", () => {
      const result = paymentListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("accepts filter by invoiceId", () => {
      const result = paymentListQuerySchema.safeParse({
        invoiceId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts filter by customerId", () => {
      const result = paymentListQuerySchema.safeParse({
        customerId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts date range filter", () => {
      const result = paymentListQuerySchema.safeParse({
        fromDate: "2026-01-01",
        toDate: "2026-02-28",
      });
      expect(result.success).toBe(true);
    });

    it("coerces string numbers for limit and offset", () => {
      const result = paymentListQuerySchema.safeParse({
        limit: "15",
        offset: "10",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(15);
        expect(result.data.offset).toBe(10);
      }
    });
  });
});

describe("Payment Routes", () => {
  it("POST /api/payments requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).post("/api/payments").send({
      invoiceId: crypto.randomUUID(),
      amount: 5000,
      paymentMethod: "cash",
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/payments requires sales_invoicing permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        invoiceId: crypto.randomUUID(),
        amount: 5000,
        paymentMethod: "cash",
      });
    expect(res.status).toBe(403);
  });

  it("GET /api/payments requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get("/api/payments");
    expect(res.status).toBe(401);
  });

  it("GET /api/payments requires sales_invoicing permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .get("/api/payments")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });
});
