import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z
    .string()
    .regex(/^\+\d{10,14}$/)
    .optional(),
  address: z.string().optional(),
  stateCode: z.string().length(2),
  gstin: z.string().max(15).optional(),
  customerType: z.enum([
    "wholesale_partial",
    "wholesale_bill_to_bill",
    "retail",
  ]),
  creditPeriodDays: z.number().int().min(0).default(30),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z
    .string()
    .regex(/^\+\d{10,14}$/)
    .nullable()
    .optional(),
  address: z.string().nullable().optional(),
  stateCode: z.string().length(2).optional(),
  gstin: z.string().max(15).nullable().optional(),
  customerType: z
    .enum(["wholesale_partial", "wholesale_bill_to_bill", "retail"])
    .optional(),
  creditPeriodDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const bulkUpsertCustomerProductPricesSchema = z.object({
  prices: z.array(
    z.object({
      productId: z.string().uuid(),
      sellingPricePerPiece: z.number().positive(),
    })
  ),
});

export const customerListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  customerType: z
    .enum(["wholesale_partial", "wholesale_bill_to_bill", "retail"])
    .optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
