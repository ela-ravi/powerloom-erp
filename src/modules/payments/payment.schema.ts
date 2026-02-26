import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createPaymentSchema = z.object({
  invoiceId: uuidSchema,
  amount: z.number().min(0.01),
  paymentMethod: z.enum(["cash", "upi", "bank_transfer", "cheque", "other"]),
  paymentDate: z.string().optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export const paymentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  invoiceId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});
