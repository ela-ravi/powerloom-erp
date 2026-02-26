import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

const coneIssuanceItemSchema = z.object({
  color: z.string().min(1).max(100),
  batchId: uuidSchema.optional(),
  godownId: uuidSchema.optional(),
  quantityKg: z.coerce.number().positive(),
});

export const createConeIssuanceSchema = z.object({
  wagerId: uuidSchema,
  godownId: uuidSchema,
  items: z.array(coneIssuanceItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
});

export const coneIssuanceListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  wagerId: z.string().uuid().optional(),
  godownId: z.string().uuid().optional(),
});
