import { z } from "zod";

export const generateWageCycleSchema = z.object({
  cycleStartDate: z.string(),
  cycleEndDate: z.string(),
  advanceDeductionAmount: z.number().min(0).default(0),
});

export const wageCycleListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["draft", "review", "approved", "paid"]).optional(),
});

export const setDiscretionarySchema = z.object({
  wageRecordId: z.string().uuid(),
  amount: z.number().min(0),
});
