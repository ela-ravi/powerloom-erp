import { z } from "zod";

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  eventType: z.string().max(50).optional(),
  isRead: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});
