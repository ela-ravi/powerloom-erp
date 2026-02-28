import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createWagerSchema = z.object({
  userId: uuidSchema,
  wagerTypeId: z.string().uuid(),
  advanceBalance: z.coerce.number().min(0).default(0),
  originalAdvance: z.coerce.number().min(0).default(0),
});

export const updateWagerSchema = z.object({
  wagerTypeId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export const wagerListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  wagerTypeId: z.string().uuid().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const performanceQuerySchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const rankingQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
