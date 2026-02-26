import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

const invoiceItemSchema = z.object({
  productId: uuidSchema,
  color: z.string().min(1).max(50),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  batchId: z.string().uuid().optional(),
});

export const createInvoiceSchema = z.object({
  customerId: uuidSchema,
  invoiceDate: z.string().optional(),
  ewayBillNumber: z.string().max(50).optional(),
  batchId: z.string().uuid().optional(),
  items: z.array(invoiceItemSchema).min(1),
});

export const updateInvoiceSchema = z.object({
  ewayBillNumber: z.string().max(50).optional(),
  items: z.array(invoiceItemSchema).min(1).optional(),
});

export const invoiceListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  customerId: z.string().uuid().optional(),
  status: z
    .enum(["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"])
    .optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});
