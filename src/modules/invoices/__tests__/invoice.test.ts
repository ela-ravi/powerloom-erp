import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceListQuerySchema,
} from "../invoice.schema.js";
import crypto from "crypto";

describe("Invoice Schemas", () => {
  describe("createInvoiceSchema", () => {
    it("accepts valid invoice data", () => {
      const result = createInvoiceSchema.safeParse({
        customerId: crypto.randomUUID(),
        items: [
          {
            productId: crypto.randomUUID(),
            color: "Red",
            quantity: 10,
            unitPrice: 150,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing customerId", () => {
      const result = createInvoiceSchema.safeParse({
        items: [
          {
            productId: crypto.randomUUID(),
            color: "Red",
            quantity: 10,
            unitPrice: 150,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty items array", () => {
      const result = createInvoiceSchema.safeParse({
        customerId: crypto.randomUUID(),
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects items with zero quantity", () => {
      const result = createInvoiceSchema.safeParse({
        customerId: crypto.randomUUID(),
        items: [
          {
            productId: crypto.randomUUID(),
            color: "Red",
            quantity: 0,
            unitPrice: 150,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects items with negative unitPrice", () => {
      const result = createInvoiceSchema.safeParse({
        customerId: crypto.randomUUID(),
        items: [
          {
            productId: crypto.randomUUID(),
            color: "Red",
            quantity: 10,
            unitPrice: -50,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional invoiceDate", () => {
      const result = createInvoiceSchema.safeParse({
        customerId: crypto.randomUUID(),
        invoiceDate: "2026-02-15",
        items: [
          {
            productId: crypto.randomUUID(),
            color: "Blue",
            quantity: 5,
            unitPrice: 200,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional ewayBillNumber", () => {
      const result = createInvoiceSchema.safeParse({
        customerId: crypto.randomUUID(),
        ewayBillNumber: "EWB-12345",
        items: [
          {
            productId: crypto.randomUUID(),
            color: "Green",
            quantity: 20,
            unitPrice: 100,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional batchId on items", () => {
      const result = createInvoiceSchema.safeParse({
        customerId: crypto.randomUUID(),
        items: [
          {
            productId: crypto.randomUUID(),
            color: "White",
            quantity: 15,
            unitPrice: 120,
            batchId: crypto.randomUUID(),
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts multiple items", () => {
      const result = createInvoiceSchema.safeParse({
        customerId: crypto.randomUUID(),
        items: [
          {
            productId: crypto.randomUUID(),
            color: "Red",
            quantity: 10,
            unitPrice: 150,
          },
          {
            productId: crypto.randomUUID(),
            color: "Blue",
            quantity: 20,
            unitPrice: 200,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects items missing color", () => {
      const result = createInvoiceSchema.safeParse({
        customerId: crypto.randomUUID(),
        items: [
          {
            productId: crypto.randomUUID(),
            quantity: 10,
            unitPrice: 150,
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateInvoiceSchema", () => {
    it("accepts ewayBillNumber update", () => {
      const result = updateInvoiceSchema.safeParse({
        ewayBillNumber: "EWB-99999",
      });
      expect(result.success).toBe(true);
    });

    it("accepts items update", () => {
      const result = updateInvoiceSchema.safeParse({
        items: [
          {
            productId: crypto.randomUUID(),
            color: "Red",
            quantity: 5,
            unitPrice: 100,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty update (no changes)", () => {
      const result = updateInvoiceSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("invoiceListQuerySchema", () => {
    it("accepts empty query with defaults", () => {
      const result = invoiceListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("accepts filter by customerId", () => {
      const result = invoiceListQuerySchema.safeParse({
        customerId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts filter by status", () => {
      for (const status of [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ]) {
        const result = invoiceListQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid status", () => {
      const result = invoiceListQuerySchema.safeParse({
        status: "pending",
      });
      expect(result.success).toBe(false);
    });

    it("accepts date range filter", () => {
      const result = invoiceListQuerySchema.safeParse({
        fromDate: "2026-01-01",
        toDate: "2026-02-28",
      });
      expect(result.success).toBe(true);
    });

    it("coerces string numbers for limit and offset", () => {
      const result = invoiceListQuerySchema.safeParse({
        limit: "10",
        offset: "5",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(5);
      }
    });
  });
});

describe("Invoice Routes", () => {
  it("POST /api/invoices requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app)
      .post("/api/invoices")
      .send({
        customerId: crypto.randomUUID(),
        items: [
          {
            productId: crypto.randomUUID(),
            color: "Red",
            quantity: 10,
            unitPrice: 150,
          },
        ],
      });
    expect(res.status).toBe(401);
  });

  it("POST /api/invoices requires sales_invoicing permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .post("/api/invoices")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        customerId: crypto.randomUUID(),
        items: [
          {
            productId: crypto.randomUUID(),
            color: "Red",
            quantity: 10,
            unitPrice: 150,
          },
        ],
      });
    expect(res.status).toBe(403);
  });

  it("GET /api/invoices requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get("/api/invoices");
    expect(res.status).toBe(401);
  });

  it("GET /api/invoices requires sales_invoicing permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .get("/api/invoices")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/invoices/:id requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get(`/api/invoices/${crypto.randomUUID()}`);
    expect(res.status).toBe(401);
  });

  it("PUT /api/invoices/:id requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app)
      .put(`/api/invoices/${crypto.randomUUID()}`)
      .send({ ewayBillNumber: "EWB-123" });
    expect(res.status).toBe(401);
  });

  it("PUT /api/invoices/:id/issue requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).put(
      `/api/invoices/${crypto.randomUUID()}/issue`,
    );
    expect(res.status).toBe(401);
  });

  it("PUT /api/invoices/:id/cancel requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).put(
      `/api/invoices/${crypto.randomUUID()}/cancel`,
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/invoices/:id/eway-bill requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get(
      `/api/invoices/${crypto.randomUUID()}/eway-bill`,
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/invoices/customer/:id/statement requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get(
      `/api/invoices/customer/${crypto.randomUUID()}/statement`,
    );
    expect(res.status).toBe(401);
  });

  it("PUT /api/invoices/:id/issue requires sales_invoicing permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .put(`/api/invoices/${crypto.randomUUID()}/issue`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("PUT /api/invoices/:id/cancel requires sales_invoicing permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .put(`/api/invoices/${crypto.randomUUID()}/cancel`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });
});
