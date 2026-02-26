import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createAdvanceSchema = z.object({
  wagerId: uuidSchema,
  amount: z.number().min(0.01),
  notes: z.string().optional(),
});

export const advanceListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  wagerId: z.string().uuid().optional(),
  type: z
    .enum(["advance_given", "advance_deduction", "discretionary_addition"])
    .optional(),
});
