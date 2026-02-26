import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const upsertProductOodaiWeightSchema = z.object({
  productId: uuidSchema,
  oodaiWeightKg: z.coerce.number().positive(),
});

export const bulkUpsertProductOodaiWeightSchema = z.object({
  items: z.array(
    z.object({
      productId: uuidSchema,
      oodaiWeightKg: z.coerce.number().positive(),
    }),
  ).min(1),
});
