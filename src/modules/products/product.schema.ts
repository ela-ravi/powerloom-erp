import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

const decimalRate = z.coerce.number().min(0);

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.string().min(1).max(20),
  actualSize: z.string().max(20).nullable().optional(),
  category: z.enum(["single", "double", "triple", "quad"]),
  paavuToPieceRatio: decimalRate,
  paavuConsumptionGrams: decimalRate.default(0),
  paavuWastageGrams: decimalRate.default(0),
  paavuWastagePct: decimalRate.nullable().optional(),
  oodaiConsumptionGrams: decimalRate.default(0),
  oodaiWastageGrams: decimalRate.default(0),
  oodaiWastagePct: decimalRate.nullable().optional(),
  oodaiKgPerPaavu: decimalRate.nullable().optional(),
  wageRatePerKg: decimalRate.default(0),
  wageRatePerPiece: decimalRate.default(0),
  stitchRatePerPiece: decimalRate.default(0),
  knotRatePerPiece: decimalRate.default(0),
  smallBundleCount: z.number().int().positive().default(10),
  largeBundleCount: z.number().int().positive().default(50),
  bundleRateSmall: decimalRate.default(0),
  bundleRateLarge: decimalRate.default(0),
  gstRatePct: decimalRate.default(5.0),
  colorPricingMode: z.enum(["average", "per_color"]).default("average"),
  hsnCode: z.string().max(20).nullable().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  size: z.string().min(1).max(20).optional(),
  actualSize: z.string().max(20).nullable().optional(),
  category: z.enum(["single", "double", "triple", "quad"]).optional(),
  paavuToPieceRatio: decimalRate.optional(),
  paavuConsumptionGrams: decimalRate.optional(),
  paavuWastageGrams: decimalRate.optional(),
  paavuWastagePct: decimalRate.nullable().optional(),
  oodaiConsumptionGrams: decimalRate.optional(),
  oodaiWastageGrams: decimalRate.optional(),
  oodaiWastagePct: decimalRate.nullable().optional(),
  oodaiKgPerPaavu: decimalRate.nullable().optional(),
  wageRatePerKg: decimalRate.optional(),
  wageRatePerPiece: decimalRate.optional(),
  stitchRatePerPiece: decimalRate.optional(),
  knotRatePerPiece: decimalRate.optional(),
  smallBundleCount: z.number().int().positive().optional(),
  largeBundleCount: z.number().int().positive().optional(),
  bundleRateSmall: decimalRate.optional(),
  bundleRateLarge: decimalRate.optional(),
  gstRatePct: decimalRate.optional(),
  colorPricingMode: z.enum(["average", "per_color"]).optional(),
  hsnCode: z.string().max(20).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const productListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  category: z.enum(["single", "double", "triple", "quad"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

// Color prices
export const createColorPriceSchema = z.object({
  color: z.string().min(1).max(50),
  sellingPricePerPiece: z.coerce.number().positive(),
});

export const updateColorPriceSchema = z.object({
  color: z.string().min(1).max(50).optional(),
  sellingPricePerPiece: z.coerce.number().positive().optional(),
});

// Shift wage rates
export const createShiftRateSchema = z.object({
  shift: z.enum(["morning", "evening", "night"]),
  wageRatePerKg: z.coerce.number().min(0),
  wageRatePerPiece: z.coerce.number().min(0),
});

export const updateShiftRateSchema = z.object({
  wageRatePerKg: z.coerce.number().min(0).optional(),
  wageRatePerPiece: z.coerce.number().min(0).optional(),
});
