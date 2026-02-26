import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createLoomSchema = z.object({
  loomTypeId: uuidSchema,
  loomNumber: z.string().min(1).max(50),
  assignedWagerId: uuidSchema.optional(),
  ownership: z.enum(["owner", "wager"]),
  maintenanceStatus: z
    .enum(["operational", "under_maintenance", "idle"])
    .default("operational"),
});

export const updateLoomSchema = z.object({
  loomTypeId: uuidSchema.optional(),
  loomNumber: z.string().min(1).max(50).optional(),
  assignedWagerId: uuidSchema.nullable().optional(),
  ownership: z.enum(["owner", "wager"]).optional(),
  maintenanceStatus: z
    .enum(["operational", "under_maintenance", "idle"])
    .optional(),
  isActive: z.boolean().optional(),
});

export const assignWagerSchema = z.object({
  wagerId: uuidSchema.nullable(),
});

export const loomListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  loomTypeId: z.string().uuid().optional(),
  maintenanceStatus: z
    .enum(["operational", "under_maintenance", "idle"])
    .optional(),
  assignedWagerId: z.string().uuid().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
