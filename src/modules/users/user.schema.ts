import { z } from "zod";

export const createUserSchema = z.object({
  phone: z.string().regex(/^\+\d{10,14}$/),
  name: z.string().min(1).max(255),
  role: z.enum(["owner", "staff", "wager", "tailor", "packager", "paavu_oati"]),
  language: z.string().min(2).max(5).default("en"),
  wagerTypeId: z.string().uuid().optional(),
  initialAdvance: z.coerce.number().min(0).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z
    .string()
    .regex(/^\+\d{10,14}$/)
    .optional(),
  language: z.string().min(2).max(5).optional(),
  role: z.enum(["owner", "staff", "wager", "tailor", "packager", "paavu_oati"]).optional(),
  wagerTypeId: z.string().uuid().optional(),
});

export const setPermissionsSchema = z.object({
  permissions: z.array(
    z.enum([
      "godown_management",
      "production_entry",
      "wage_processing",
      "sales_invoicing",
      "reports",
      "damage_approval",
      "master_data",
    ]),
  ),
});

export const userListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  role: z.enum(["owner", "staff", "wager", "tailor", "packager", "paavu_oati"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
