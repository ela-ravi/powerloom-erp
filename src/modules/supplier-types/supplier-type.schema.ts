import { z } from "zod";

export const createSupplierTypeSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateSupplierTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});
