import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createTransferSchema = z.object({
  sourceGodownId: uuidSchema,
  destGodownId: uuidSchema,
  productId: uuidSchema.nullable().optional(),
  color: z.string().min(1).max(100),
  stage: z.enum(["raw_cone", "paavu", "woven", "tailored", "bundled", "sold"]),
  batchId: uuidSchema.nullable().optional(),
  quantity: z.coerce.number().positive(),
  weightKg: z.coerce.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const transferListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sourceGodownId: z.string().uuid().optional(),
  destGodownId: z.string().uuid().optional(),
});
