import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

const paavuIssuanceItemSchema = z.object({
  productId: uuidSchema,
  color: z.string().min(1).max(100),
  batchId: uuidSchema.optional(),
  godownId: uuidSchema.optional(),
  paavuCount: z.coerce.number().int().positive(),
});

export const createPaavuIssuanceSchema = z.object({
  wagerId: uuidSchema,
  godownId: uuidSchema,
  items: z.array(paavuIssuanceItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
});

export const paavuIssuanceListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  wagerId: z.string().uuid().optional(),
  godownId: z.string().uuid().optional(),
});
