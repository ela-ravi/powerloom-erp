import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createBatchSchema = z.object({
  productId: uuidSchema,
  notes: z.string().optional(),
});

export const updateBatchSchema = z.object({
  productId: uuidSchema.optional(),
  notes: z.string().nullable().optional(),
});

export const updateBatchStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "closed"]),
});

export const batchListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["open", "in_progress", "closed"]).optional(),
  productId: z.string().uuid().optional(),
});
