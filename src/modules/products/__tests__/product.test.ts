import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createProductSchema,
  updateProductSchema,
  productListQuerySchema,
  createColorPriceSchema,
  updateColorPriceSchema,
  createShiftRateSchema,
  updateShiftRateSchema,
} from "../product.schema.js";
import crypto from "crypto";

const validProduct = {
  name: "Khadi",
  size: "30x60",
  category: "single" as const,
  paavuToPieceRatio: 1.0,
  paavuConsumptionGrams: 150,
  oodaiConsumptionGrams: 200,
};

describe("Product Schemas", () => {
  describe("createProductSchema", () => {
    it("accepts valid product with required fields", () => {
      const result = createProductSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
    });

    it("applies correct defaults", () => {
      const result = createProductSchema.parse(validProduct);
      expect(result.paavuWastageGrams).toBe(0);
      expect(result.oodaiWastageGrams).toBe(0);
      expect(result.wageRatePerKg).toBe(0);
      expect(result.wageRatePerPiece).toBe(0);
      expect(result.stitchRatePerPiece).toBe(0);
      expect(result.knotRatePerPiece).toBe(0);
      expect(result.smallBundleCount).toBe(10);
      expect(result.largeBundleCount).toBe(50);
      expect(result.bundleRateSmall).toBe(0);
      expect(result.bundleRateLarge).toBe(0);
      expect(result.gstRatePct).toBe(5.0);
      expect(result.colorPricingMode).toBe("average");
    });

    it("accepts all product categories", () => {
      for (const category of ["single", "double", "triple", "quad"]) {
        expect(
          createProductSchema.safeParse({ ...validProduct, category }).success,
        ).toBe(true);
      }
    });

    it("rejects invalid category", () => {
      const result = createProductSchema.safeParse({
        ...validProduct,
        category: "quintuple",
      });
      expect(result.success).toBe(false);
    });

    it("accepts both color pricing modes", () => {
      for (const mode of ["average", "per_color"]) {
        expect(
          createProductSchema.safeParse({
            ...validProduct,
            colorPricingMode: mode,
          }).success,
        ).toBe(true);
      }
    });

    it("rejects negative rates", () => {
      const result = createProductSchema.safeParse({
        ...validProduct,
        wageRatePerKg: -5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing name", () => {
      const { name, ...rest } = validProduct;
      const result = createProductSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects missing size", () => {
      const { size, ...rest } = validProduct;
      const result = createProductSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("accepts full product with all fields", () => {
      const result = createProductSchema.safeParse({
        ...validProduct,
        paavuWastageGrams: 5,
        paavuWastagePct: 3.5,
        oodaiWastageGrams: 8,
        oodaiWastagePct: 4.0,
        wageRatePerKg: 25.0,
        wageRatePerPiece: 3.5,
        stitchRatePerPiece: 1.0,
        knotRatePerPiece: 0.5,
        smallBundleCount: 12,
        largeBundleCount: 48,
        bundleRateSmall: 5.0,
        bundleRateLarge: 20.0,
        gstRatePct: 12.0,
        colorPricingMode: "per_color",
        hsnCode: "5208",
      });
      expect(result.success).toBe(true);
    });

    it("accepts nullable wastage percentage", () => {
      const result = createProductSchema.safeParse({
        ...validProduct,
        paavuWastagePct: null,
        oodaiWastagePct: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateProductSchema", () => {
    it("accepts partial update", () => {
      const result = updateProductSchema.safeParse({
        wageRatePerKg: 30.0,
      });
      expect(result.success).toBe(true);
    });

    it("accepts isActive field", () => {
      const result = updateProductSchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = updateProductSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("productListQuerySchema", () => {
    it("provides defaults", () => {
      const result = productListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts category filter", () => {
      const result = productListQuerySchema.parse({ category: "double" });
      expect(result.category).toBe("double");
    });

    it("transforms isActive string to boolean", () => {
      const result = productListQuerySchema.parse({ isActive: "true" });
      expect(result.isActive).toBe(true);
    });
  });

  describe("createColorPriceSchema", () => {
    it("accepts valid color price data", () => {
      const result = createColorPriceSchema.safeParse({
        color: "White",
        sellingPricePerPiece: 45.0,
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing color", () => {
      const result = createColorPriceSchema.safeParse({
        sellingPricePerPiece: 45.0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero price", () => {
      const result = createColorPriceSchema.safeParse({
        color: "White",
        sellingPricePerPiece: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative price", () => {
      const result = createColorPriceSchema.safeParse({
        color: "White",
        sellingPricePerPiece: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createShiftRateSchema", () => {
    it("accepts valid shift rate data", () => {
      const result = createShiftRateSchema.safeParse({
        shift: "morning",
        wageRatePerKg: 30.0,
        wageRatePerPiece: 4.0,
      });
      expect(result.success).toBe(true);
    });

    it("accepts all shift types", () => {
      for (const shift of ["morning", "evening", "night"]) {
        expect(
          createShiftRateSchema.safeParse({
            shift,
            wageRatePerKg: 30.0,
            wageRatePerPiece: 4.0,
          }).success,
        ).toBe(true);
      }
    });

    it("rejects invalid shift type", () => {
      const result = createShiftRateSchema.safeParse({
        shift: "afternoon",
        wageRatePerKg: 30.0,
        wageRatePerPiece: 4.0,
      });
      expect(result.success).toBe(false);
    });

    it("accepts zero rates", () => {
      const result = createShiftRateSchema.safeParse({
        shift: "morning",
        wageRatePerKg: 0,
        wageRatePerPiece: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateShiftRateSchema", () => {
    it("accepts partial update", () => {
      const result = updateShiftRateSchema.safeParse({
        wageRatePerKg: 35.0,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("Product Routes", () => {
  it("POST /api/products requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).post("/api/products").send(validProduct);

    expect(res.status).toBe(401);
  });

  it("POST /api/products returns 400 for invalid body", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test" }); // missing required fields

    expect(res.status).toBe(400);
  });

  it("GET /api/products requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/products");

    expect(res.status).toBe(401);
  });

  it("PUT /api/products/:id requires master_data permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .put("/api/products/some-id")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ wageRatePerKg: 30.0 });

    expect(res.status).toBe(403);
  });

  it("POST /api/products/:id/color-prices requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app)
      .post(`/api/products/${crypto.randomUUID()}/color-prices`)
      .send({ color: "White", sellingPricePerPiece: 45.0 });

    expect(res.status).toBe(401);
  });

  it("POST /api/products/:id/shift-rates requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app)
      .post(`/api/products/${crypto.randomUUID()}/shift-rates`)
      .send({ shift: "morning", wageRatePerKg: 30.0, wageRatePerPiece: 4.0 });

    expect(res.status).toBe(401);
  });

  it("DELETE /api/products/:id/color-prices/:priceId requires master_data permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .delete(
        `/api/products/${crypto.randomUUID()}/color-prices/${crypto.randomUUID()}`,
      )
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });
});
