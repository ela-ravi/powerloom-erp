import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createProductionReturnSchema = z.object({
  wagerId: uuidSchema,
  loomId: uuidSchema,
  godownId: uuidSchema,
  productId: uuidSchema,
  color: z.string().min(1).max(100),
  batchId: uuidSchema.optional(),
  shiftId: uuidSchema.optional(),
  pieceCount: z.coerce.number().int().positive().optional(),
  weightKg: z.coerce.number().positive().optional(),
  wastageKg: z.coerce.number().min(0).default(0),
  returnDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateProductionReturnSchema = z.object({
  loomId: uuidSchema.optional(),
  godownId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  color: z.string().min(1).max(100).optional(),
  batchId: uuidSchema.nullable().optional(),
  shiftId: uuidSchema.nullable().optional(),
  pieceCount: z.coerce.number().int().positive().nullable().optional(),
  weightKg: z.coerce.number().positive().nullable().optional(),
  returnDate: z.string().optional(),
  notes: z.string().nullable().optional(),
});

export const productionReturnListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  wagerId: z.string().uuid().optional(),
  loomId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});
