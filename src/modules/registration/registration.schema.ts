import { z } from "zod";

export const registrationOtpSendSchema = z.object({
  phone: z.string().regex(/^\+\d{10,14}$/, "Invalid phone number format"),
});

export const registerTenantSchema = z.object({
  businessName: z.string().min(1).max(255),
  ownerName: z.string().min(1).max(255),
  phone: z.string().regex(/^\+\d{10,14}$/),
  stateCode: z.string().length(2),
  email: z.string().email().optional(),
  gstin: z
    .string()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/)
    .optional(),
  otpCode: z.string().length(6),
});
