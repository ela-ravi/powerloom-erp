import { z } from "zod";

export const createLoomTypeSchema = z.object({
  name: z.string().min(1).max(100),
  nickname: z.string().min(1).max(50).optional(),
  capacityPiecesPerDay: z.number().int().positive(),
});

export const updateLoomTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nickname: z.string().min(1).max(50).nullable().optional(),
  capacityPiecesPerDay: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const loomTypeListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
