import { z } from "zod";

export const createShiftSchema = z.object({
  name: z.string().min(1).max(100),
  startTime: z.string(), // HH:MM format
  endTime: z.string(), // HH:MM format
});

export const updateShiftSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const shiftListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
