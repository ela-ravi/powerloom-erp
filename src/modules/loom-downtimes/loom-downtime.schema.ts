import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createLoomDowntimeSchema = z.object({
  loomId: uuidSchema,
  wagerId: uuidSchema.optional(),
  reason: z.enum(["mechanical", "electrical", "material_shortage", "other"]),
  customReason: z.string().max(255).optional(),
  startTime: z.string(),
  notes: z.string().optional(),
});

export const updateLoomDowntimeSchema = z.object({
  endTime: z.string(),
  notes: z.string().optional(),
});

export const loomDowntimeListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  loomId: z.string().uuid().optional(),
  wagerId: z.string().uuid().optional(),
});
