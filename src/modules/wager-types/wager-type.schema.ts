import { z } from "zod";

export const createWagerTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  wageBasis: z.enum(["per_kg", "per_piece"]),
  loomOwnership: z.enum(["wager", "owner"]),
  workScope: z.enum(["paavu_oodai", "oodai_only"]),
});

export const updateWagerTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  wageBasis: z.enum(["per_kg", "per_piece"]).optional(),
  loomOwnership: z.enum(["wager", "owner"]).optional(),
  workScope: z.enum(["paavu_oodai", "oodai_only"]).optional(),
  isActive: z.boolean().optional(),
});

export const wagerTypeListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
