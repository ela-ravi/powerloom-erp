import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createTailoringRecordSchema = z.object({
  tailorId: uuidSchema,
  godownId: uuidSchema,
  productId: uuidSchema,
  color: z.string().min(1).max(100),
  batchId: uuidSchema.optional(),
  stitchCount: z.number().int().min(1),
  knotCount: z.number().int().min(0).default(0),
  workDate: z.string().optional(),
  notes: z.string().optional(),
});

export const tailoringRecordListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  tailorId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
