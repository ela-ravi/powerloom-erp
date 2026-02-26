import { z } from "zod";

export const inventoryListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  godownId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  color: z.string().optional(),
  stage: z
    .enum(["raw_cone", "paavu", "woven", "tailored", "bundled", "sold"])
    .optional(),
  batchId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const inventorySummaryQuerySchema = z.object({
  godownId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

export const movementListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const allMovementsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  movementType: z.enum(["increase", "decrease", "transfer_in", "transfer_out"]).optional(),
  referenceType: z.string().optional(),
});

export const availableStockQuerySchema = z.object({
  godownId: z.string().uuid(),
  stage: z.enum(["raw_cone", "paavu", "woven", "tailored", "bundled", "sold"]).default("raw_cone"),
});
