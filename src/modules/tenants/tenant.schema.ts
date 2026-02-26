import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  ownerName: z.string().min(1).max(255),
  phone: z.string().regex(/^\+\d{10,14}$/),
  email: z.string().email().optional(),
  address: z.string().optional(),
  stateCode: z.string().length(2),
  gstin: z
    .string()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/)
    .optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  ownerName: z.string().min(1).max(255).optional(),
  phone: z
    .string()
    .regex(/^\+\d{10,14}$/)
    .optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  stateCode: z.string().length(2).optional(),
  gstin: z
    .string()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/)
    .nullable()
    .optional(),
});

export const updateTenantStatusSchema = z.object({
  status: z.enum(["active", "suspended", "trial"]),
});

export const tenantListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  status: z.enum(["active", "suspended", "trial"]).optional(),
});

export const createTenantWithOwnerSchema = z.object({
  name: z.string().min(1).max(255),
  ownerName: z.string().min(1).max(255),
  phone: z.string().regex(/^\+\d{10,14}$/),
  email: z.string().email().optional(),
  address: z.string().optional(),
  stateCode: z.string().length(2),
  gstin: z
    .string()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/)
    .optional(),
  status: z.enum(["active", "suspended", "trial"]).optional(),
});

export const updateTenantSettingsSchema = z.object({
  batchEnabled: z.boolean().optional(),
  shiftEnabled: z.boolean().optional(),
  interGodownTransferEnabled: z.boolean().optional(),
  authOtpEnabled: z.boolean().optional(),
  authPinEnabled: z.boolean().optional(),
  wageCycleDay: z.number().int().min(0).max(6).optional(),
  defaultCreditPeriodDays: z.number().int().min(1).optional(),
  paavuWastageLimitGrams: z.number().int().min(0).optional(),
  coneBundleWeightKg: z.number().min(1).optional(),
  damageMinorDeductionPct: z.number().min(0).max(100).optional(),
  damageMajorDeductionPct: z.number().min(0).max(100).optional(),
  damageRejectDeductionPct: z.number().min(0).max(100).optional(),
  showWagerRanking: z.boolean().optional(),
  currency: z.string().length(3).optional(),
  locale: z.string().min(2).max(10).optional(),
});
