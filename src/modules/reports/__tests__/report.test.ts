import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  productionSummaryQuerySchema,
  profitabilityQuerySchema,
  dateRangeQuerySchema,
  stockQuerySchema,
  revenueQuerySchema,
  downtimeQuerySchema,
  shiftProductionQuerySchema,
} from "../report.schema.js";
import crypto from "crypto";

describe("Report Schemas", () => {
  describe("productionSummaryQuerySchema", () => {
    it("accepts empty query with defaults", () => {
      const result = productionSummaryQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.groupBy).toBe("day");
      }
    });

    it("accepts groupBy week", () => {
      const result = productionSummaryQuerySchema.safeParse({
        groupBy: "week",
      });
      expect(result.success).toBe(true);
    });

    it("accepts groupBy month", () => {
      const result = productionSummaryQuerySchema.safeParse({
        groupBy: "month",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid groupBy", () => {
      const result = productionSummaryQuerySchema.safeParse({
        groupBy: "year",
      });
      expect(result.success).toBe(false);
    });

    it("accepts date range filter", () => {
      const result = productionSummaryQuerySchema.safeParse({
        fromDate: "2026-01-01",
        toDate: "2026-02-28",
      });
      expect(result.success).toBe(true);
    });

    it("accepts productId filter", () => {
      const result = productionSummaryQuerySchema.safeParse({
        productId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts batchId filter", () => {
      const result = productionSummaryQuerySchema.safeParse({
        batchId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("profitabilityQuerySchema", () => {
    it("accepts empty query", () => {
      const result = profitabilityQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts batchId filter", () => {
      const result = profitabilityQuerySchema.safeParse({
        batchId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("dateRangeQuerySchema", () => {
    it("accepts empty query", () => {
      const result = dateRangeQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts date range", () => {
      const result = dateRangeQuerySchema.safeParse({
        fromDate: "2026-01-01",
        toDate: "2026-12-31",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("stockQuerySchema", () => {
    it("accepts empty query", () => {
      const result = stockQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts godownId filter", () => {
      const result = stockQuerySchema.safeParse({
        godownId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts color filter", () => {
      const result = stockQuerySchema.safeParse({ color: "Red" });
      expect(result.success).toBe(true);
    });
  });

  describe("revenueQuerySchema", () => {
    it("accepts empty query with defaults", () => {
      const result = revenueQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.groupBy).toBe("month");
      }
    });

    it("accepts groupBy day", () => {
      const result = revenueQuerySchema.safeParse({ groupBy: "day" });
      expect(result.success).toBe(true);
    });
  });

  describe("downtimeQuerySchema", () => {
    it("accepts empty query with reason default", () => {
      const result = downtimeQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.groupBy).toBe("reason");
      }
    });

    it("accepts groupBy loom", () => {
      const result = downtimeQuerySchema.safeParse({ groupBy: "loom" });
      expect(result.success).toBe(true);
    });

    it("accepts groupBy wager", () => {
      const result = downtimeQuerySchema.safeParse({ groupBy: "wager" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid groupBy", () => {
      const result = downtimeQuerySchema.safeParse({ groupBy: "shift" });
      expect(result.success).toBe(false);
    });
  });

  describe("shiftProductionQuerySchema", () => {
    it("accepts empty query", () => {
      const result = shiftProductionQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts productId filter", () => {
      const result = shiftProductionQuerySchema.safeParse({
        productId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts date range filter", () => {
      const result = shiftProductionQuerySchema.safeParse({
        fromDate: "2026-01-01",
        toDate: "2026-02-28",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("Report Routes", () => {
  const reportEndpoints = [
    "/api/reports/production-summary",
    "/api/reports/batch-profitability",
    "/api/reports/color-profitability",
    "/api/reports/product-profitability",
    `/api/reports/wage-sheet/${crypto.randomUUID()}`,
    "/api/reports/wager-damage",
    "/api/reports/wager-utilization",
    "/api/reports/wager-advance",
    "/api/reports/cone-stock",
    "/api/reports/finished-stock",
    "/api/reports/stock-movement",
    "/api/reports/gst-summary",
    "/api/reports/supplier-ledger",
    "/api/reports/revenue",
    "/api/reports/customer-aging",
    "/api/reports/downtime",
    "/api/reports/shift-production",
  ];

  for (const endpoint of reportEndpoints) {
    const name = endpoint.split("/api/reports/")[1];

    it(`GET ${endpoint} requires authentication`, async () => {
      const { app } = await import("../../../../tests/utils/test-helpers.js");
      const res = await request(app).get(endpoint);
      expect(res.status).toBe(401);
    });

    it(`GET ${endpoint} requires reports permission`, async () => {
      const { app, getAuthToken } =
        await import("../../../../tests/utils/test-helpers.js");
      const { accessToken } = getAuthToken(
        undefined,
        undefined,
        UserRole.WAGER,
      );
      const res = await request(app)
        .get(endpoint)
        .set("Authorization", `Bearer ${accessToken}`);
      expect(res.status).toBe(403);
    });
  }
});
