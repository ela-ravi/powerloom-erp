import { z } from "zod";

export const otpSendSchema = z.object({
  phone: z.string().regex(/^\+\d{10,14}$/, "Invalid phone number format"),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+\d{10,14}$/),
  code: z.string().length(6),
});

export const pinVerifySchema = z.object({
  phone: z.string().regex(/^\+\d{10,14}$/),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export const pinSetSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
