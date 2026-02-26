import { z } from "zod";

export const createGodownTypeSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateGodownTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});
