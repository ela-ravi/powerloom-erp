import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createAdvanceSchema,
  advanceListQuerySchema,
} from "./advance.schema.js";
import { AdvanceService } from "./advance.service.js";

const router: IRouter = Router();
const service = new AdvanceService();

// POST /api/advances
router.post(
  "/",
  authenticate,
  validate({ body: createAdvanceSchema }),
  requirePermission(Permission.WAGE_PROCESSING),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.issueAdvance(
        authReq.user.tenantId,
        authReq.user.id,
        req.body,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/advances
router.get(
  "/",
  authenticate,
  validate({ query: advanceListQuerySchema }),
  requirePermission(Permission.WAGE_PROCESSING),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.findAll(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export const advanceRoutes = router;
