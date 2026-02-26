import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createConePurchaseSchema = z.object({
  supplierId: uuidSchema,
  godownId: uuidSchema,
  productId: uuidSchema.optional(),
  supplierType: z.string().min(1).max(100).optional(),
  color: z.string().min(1).max(100),
  batchId: uuidSchema.optional(),
  quantityKg: z.coerce.number().positive(),
  ratePerKg: z.coerce.number().positive(),
  gstRatePct: z.coerce.number().min(0).default(0),
  invoiceNumber: z.string().max(100).optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateConePurchaseSchema = z.object({
  supplierId: uuidSchema.optional(),
  godownId: uuidSchema.optional(),
  productId: uuidSchema.nullable().optional(),
  supplierType: z.string().min(1).max(100).nullable().optional(),
  color: z.string().min(1).max(100).optional(),
  batchId: uuidSchema.nullable().optional(),
  quantityKg: z.coerce.number().positive().optional(),
  ratePerKg: z.coerce.number().positive().optional(),
  gstRatePct: z.coerce.number().min(0).optional(),
  invoiceNumber: z.string().max(100).nullable().optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().nullable().optional(),
});

export const conePurchaseListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  supplierId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  supplierType: z.string().max(100).optional(),
  purchaseDateFrom: z.string().optional(),
  purchaseDateTo: z.string().optional(),
});
