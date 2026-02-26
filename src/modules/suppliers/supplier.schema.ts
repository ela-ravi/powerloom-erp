import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z
    .string()
    .regex(/^\+\d{10,14}$/)
    .optional(),
  address: z.string().optional(),
  gstin: z.string().max(15).optional(),
  supplierType: z.string().min(1).max(100).optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z
    .string()
    .regex(/^\+\d{10,14}$/)
    .nullable()
    .optional(),
  address: z.string().nullable().optional(),
  gstin: z.string().max(15).nullable().optional(),
  supplierType: z.string().min(1).max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const supplierListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
