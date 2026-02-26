import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const dateRangeQuerySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const productionSummaryQuerySchema = dateRangeQuerySchema.extend({
  groupBy: z.enum(["day", "week", "month"]).default("day"),
  productId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
});

export const profitabilityQuerySchema = dateRangeQuerySchema.extend({
  batchId: z.string().uuid().optional(),
});

export const wagerDamageQuerySchema = dateRangeQuerySchema.extend({
  wagerId: z.string().uuid().optional(),
});

export const stockQuerySchema = z.object({
  godownId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  color: z.string().optional(),
});

export const stockMovementQuerySchema = dateRangeQuerySchema.extend({
  productId: z.string().uuid().optional(),
  godownId: z.string().uuid().optional(),
  stage: z.string().optional(),
});

export const gstSummaryQuerySchema = dateRangeQuerySchema;

export const supplierLedgerQuerySchema = dateRangeQuerySchema.extend({
  supplierId: z.string().uuid().optional(),
});

export const revenueQuerySchema = dateRangeQuerySchema.extend({
  groupBy: z.enum(["day", "week", "month"]).default("month"),
});

export const downtimeQuerySchema = dateRangeQuerySchema.extend({
  groupBy: z.enum(["reason", "loom", "wager"]).default("reason"),
});

export const shiftProductionQuerySchema = dateRangeQuerySchema.extend({
  productId: z.string().uuid().optional(),
});
