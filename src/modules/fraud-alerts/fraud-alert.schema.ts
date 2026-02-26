import { z } from "zod";

export const fraudAlertListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  alertType: z.string().max(50).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  isResolved: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
