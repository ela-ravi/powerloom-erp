import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const upsertProductOodaiWeightSchema = z.object({
  productId: uuidSchema,
  oodaiWeightKg: z.coerce.number().positive(),
  piecesPerKg: z.coerce.number().int().positive().nullish(),
});

export const bulkUpsertProductOodaiWeightSchema = z.object({
  items: z.array(
    z.object({
      productId: uuidSchema,
      oodaiWeightKg: z.coerce.number().positive(),
      piecesPerKg: z.coerce.number().int().positive().nullish(),
    }),
  ).min(1),
});
