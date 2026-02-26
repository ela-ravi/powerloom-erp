import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createPaavuProductionSchema = z.object({
  paavuOatiId: uuidSchema,
  godownId: uuidSchema,
  productId: uuidSchema,
  color: z.string().min(1).max(100),
  batchId: uuidSchema.optional(),
  coneWeightKg: z.coerce.number().positive(),
  paavuCount: z.coerce.number().int().positive(),
  wastageGrams: z.coerce.number().min(0).default(0),
  productionDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePaavuProductionSchema = createPaavuProductionSchema.partial();

export const paavuProductionListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  paavuOatiId: z.string().uuid().optional(),
  godownId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});
