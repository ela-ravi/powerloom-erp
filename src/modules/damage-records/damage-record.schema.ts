import { z } from "zod";
import { uuidSchema } from "../../shared/schemas.js";

export const createDamageRecordSchema = z
  .object({
    productionReturnId: uuidSchema.optional(),
    wagerId: uuidSchema.optional(),
    productId: uuidSchema,
    detectionPoint: z.enum(["loom", "tailoring", "packaging", "godown"]),
    grade: z.enum(["minor", "major", "reject"]),
    damageCount: z.number().int().min(1),
    productionCostPerPiece: z.number().min(0),
    isMiscellaneous: z.boolean().default(false),
    notes: z.string().optional(),
  })
  .refine((data) => data.isMiscellaneous || data.wagerId, {
    message: "wagerId is required for non-miscellaneous damage",
    path: ["wagerId"],
  });

export const damageRecordListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  wagerId: z.string().uuid().optional(),
  detectionPoint: z
    .enum(["loom", "tailoring", "packaging", "godown"])
    .optional(),
  grade: z.enum(["minor", "major", "reject"]).optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
});
