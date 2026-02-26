import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createPaavuOatiSchema = z.object({
  userId: uuidSchema,
  advanceBalance: z.coerce.number().min(0).default(0),
  originalAdvance: z.coerce.number().min(0).default(0),
});

export const updatePaavuOatiSchema = z.object({
  isActive: z.boolean().optional(),
});

export const paavuOatiListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
