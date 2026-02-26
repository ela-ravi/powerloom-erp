import { describe, it, expect, beforeAll } from "vitest";
import {
  api,
  tokens,
  adminDb,
  lookupSeedIds,
  TENANT1_ID,
  type SeedIds,
} from "../setup/helpers.js";

describe("08 — Sales & Invoicing", () => {
  let t1: SeedIds;
  let productId: string;
  let tnCustomerId: string; // Intra-state (TN → TN)
  let kaCustomerId: string; // Inter-state (TN → KA)
  let billToBillCustomerId: string;
  let intraInvoiceId: string;
  let interInvoiceId: string;

  beforeAll(async () => {
    t1 = await lookupSeedIds(TENANT1_ID);
    productId = t1.products.find((p) => p.name === "Khadi")!.id;
    tnCustomerId = t1.customers.find(
      (c) => c.stateCode === "TN" && c.customerType === "wholesale_partial",
    )!.id;
    kaCustomerId = t1.customers.find((c) => c.stateCode === "KA")!.id;
    billToBillCustomerId = t1.customers.find(
      (c) => c.customerType === "wholesale_bill_to_bill",
    )!.id;
  });

  // ── Intra-State Invoice ──────────────────────────────────────────
  it("POST /api/invoices — intra-state invoice (TN → TN) has CGST + SGST", async () => {
    const res = await api(tokens.t1Owner)
      .post("/api/invoices")
      .send({
        customerId: tnCustomerId,
        invoiceDate: "2026-02-18",
        items: [
          {
            productId,
            color: "White",
            quantity: 20,
            unitPrice: 45,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.taxType).toBe("intra_state");
    // CGST and SGST should be present
    expect(Number(res.body.data.cgstAmount)).toBeGreaterThan(0);
    expect(Number(res.body.data.sgstAmount)).toBeGreaterThan(0);
    expect(Number(res.body.data.igstAmount)).toBe(0);
    intraInvoiceId = res.body.data.id;
  });

  // ── Inter-State Invoice ──────────────────────────────────────────
  it("POST /api/invoices — inter-state invoice (TN → KA) has IGST only", async () => {
    const res = await api(tokens.t1Owner)
      .post("/api/invoices")
      .send({
        customerId: kaCustomerId,
        invoiceDate: "2026-02-18",
        items: [
          {
            productId,
            color: "White",
            quantity: 10,
            unitPrice: 47,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.taxType).toBe("inter_state");
    expect(Number(res.body.data.igstAmount)).toBeGreaterThan(0);
    expect(Number(res.body.data.cgstAmount)).toBe(0);
    expect(Number(res.body.data.sgstAmount)).toBe(0);
    interInvoiceId = res.body.data.id;
  });

  // ── Invoice Items ────────────────────────────────────────────────
  it("POST /api/invoices — multiple items with correct subtotals", async () => {
    const jakkadu = t1.products.find((p) => p.name === "Jakkadu")!.id;

    const res = await api(tokens.t1Owner)
      .post("/api/invoices")
      .send({
        customerId: tnCustomerId,
        invoiceDate: "2026-02-18",
        items: [
          { productId, color: "White", quantity: 10, unitPrice: 45 },
          { productId: jakkadu, color: "White", quantity: 5, unitPrice: 100 },
        ],
      });

    expect(res.status).toBe(201);
    // Subtotal = (10 * 45) + (5 * 100) = 450 + 500 = 950
    expect(Number(res.body.data.subtotal)).toBe(950);
  });

  // ── List Invoices ────────────────────────────────────────────────
  it("GET /api/invoices — lists invoices", async () => {
    const res = await api(tokens.t1Owner).get("/api/invoices");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/invoices/:id — retrieves single invoice", async () => {
    const res = await api(tokens.t1Owner).get(
      `/api/invoices/${intraInvoiceId}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(intraInvoiceId);
  });

  // ── Issue Invoice ────────────────────────────────────────────────
  it("PUT /api/invoices/:id/issue — issues draft invoice", async () => {
    const res = await api(tokens.t1Owner).put(
      `/api/invoices/${intraInvoiceId}/issue`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("issued");
  });

  it("PUT /api/invoices/:id/issue — cannot issue already-issued invoice", async () => {
    const res = await api(tokens.t1Owner).put(
      `/api/invoices/${intraInvoiceId}/issue`,
    );

    expect([400, 409]).toContain(res.status);
  });

  // ── Partial Payment ──────────────────────────────────────────────
  it("POST /api/payments — partial payment updates invoice status", async () => {
    const res = await api(tokens.t1Owner).post("/api/payments").send({
      invoiceId: intraInvoiceId,
      amount: 100,
      paymentMethod: "upi",
      paymentDate: "2026-02-18",
      notes: "integration-test-partial",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(100);

    // Check invoice status updated
    const invoiceRes = await api(tokens.t1Owner).get(
      `/api/invoices/${intraInvoiceId}`,
    );
    expect(invoiceRes.body.data.status).toBe("partially_paid");
  });

  // ── Full Payment ─────────────────────────────────────────────────
  it("POST /api/payments — final payment marks invoice as paid", async () => {
    // Get remaining balance
    const invoiceRes = await api(tokens.t1Owner).get(
      `/api/invoices/${intraInvoiceId}`,
    );
    const remaining = Number(invoiceRes.body.data.totalAmount) - 100; // Already paid 100

    const res = await api(tokens.t1Owner).post("/api/payments").send({
      invoiceId: intraInvoiceId,
      amount: remaining,
      paymentMethod: "bank_transfer",
      paymentDate: "2026-02-18",
      notes: "integration-test-full",
    });

    expect(res.status).toBe(201);

    // Verify invoice now paid
    const finalRes = await api(tokens.t1Owner).get(
      `/api/invoices/${intraInvoiceId}`,
    );
    expect(finalRes.body.data.status).toBe("paid");
  });

  // ── Payment List ─────────────────────────────────────────────────
  it("GET /api/payments — lists payments", async () => {
    const res = await api(tokens.t1Owner).get("/api/payments");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // ── Customer Statement ───────────────────────────────────────────
  it("GET /api/invoices/customer/:id/statement — returns customer statement", async () => {
    const res = await api(tokens.t1Owner).get(
      `/api/invoices/customer/${tnCustomerId}/statement`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  // ── E-Way Bill ───────────────────────────────────────────────────
  it("GET /api/invoices/:id/eway-bill — returns e-way bill JSON for inter-state", async () => {
    // Issue the inter-state invoice first
    await api(tokens.t1Owner).put(`/api/invoices/${interInvoiceId}/issue`);

    const res = await api(tokens.t1Owner).get(
      `/api/invoices/${interInvoiceId}/eway-bill`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  // ── Cancel Invoice ───────────────────────────────────────────────
  it("PUT /api/invoices/:id/cancel — cancels unpaid invoice", async () => {
    // Create a new invoice to cancel
    const createRes = await api(tokens.t1Owner)
      .post("/api/invoices")
      .send({
        customerId: tnCustomerId,
        invoiceDate: "2026-02-18",
        items: [{ productId, color: "White", quantity: 5, unitPrice: 45 }],
      });

    const invoiceId = createRes.body.data.id;

    const res = await api(tokens.t1Owner).put(
      `/api/invoices/${invoiceId}/cancel`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
  });

  it("PUT /api/invoices/:id/cancel — cannot cancel paid invoice", async () => {
    // intraInvoiceId is already paid
    const res = await api(tokens.t1Owner).put(
      `/api/invoices/${intraInvoiceId}/cancel`,
    );

    expect([400, 409]).toContain(res.status);
  });

  // ── Permission Check ─────────────────────────────────────────────
  it("POST /api/invoices — wager gets 403", async () => {
    const res = await api(tokens.t1WagerT1)
      .post("/api/invoices")
      .send({
        customerId: tnCustomerId,
        items: [{ productId, color: "White", quantity: 5, unitPrice: 45 }],
      });

    expect(res.status).toBe(403);
  });
});
