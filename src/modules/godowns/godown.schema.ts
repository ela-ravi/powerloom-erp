import { z } from "zod";

export const createGodownSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().optional(),
  isMain: z.boolean().default(false),
  godownType: z.string().min(1).max(100).default("godown"),
});

export const updateGodownSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().nullable().optional(),
  isMain: z.boolean().optional(),
  godownType: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const godownListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  godownType: z.string().min(1).max(100).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
