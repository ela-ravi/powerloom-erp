import { z } from "zod";

export const createInviteSchema = z.object({
  role: z.enum(["owner", "staff", "wager", "tailor", "packager"]),
  maxUses: z.number().int().min(1).max(100).default(1),
  expiresInDays: z.number().int().min(1).max(90).optional(),
});

export const inviteListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const validateInviteCodeSchema = z.object({
  code: z.string().min(6).max(8),
});

export const inviteOtpSendSchema = z.object({
  code: z.string().min(6).max(8),
  phone: z.string().regex(/^\+\d{10,14}$/, "Invalid phone number format"),
});

export const redeemInviteSchema = z.object({
  code: z.string().min(6).max(8),
  name: z.string().min(1).max(255),
  phone: z.string().regex(/^\+\d{10,14}$/),
  otpCode: z.string().length(6),
});
