import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createPackagingRecordSchema = z.object({
  packagerId: uuidSchema,
  godownId: uuidSchema,
  productId: uuidSchema,
  color: z.string().min(1).max(100),
  batchId: uuidSchema.optional(),
  bundleType: z.enum(["small", "large"]),
  bundleCount: z.number().int().min(1),
  workDate: z.string().optional(),
  notes: z.string().optional(),
});

export const packagingRecordListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  packagerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  bundleType: z.enum(["small", "large"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
