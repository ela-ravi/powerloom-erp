import { Router, type IRouter } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createProductionReturnSchema,
  productionReturnListQuerySchema,
} from "./production-return.schema.js";
import { ProductionReturnService } from "./production-return.service.js";

const router: IRouter = Router();
const service = new ProductionReturnService();

// GET /api/production-returns/wager-context/:wagerId
router.get(
  "/wager-context/:wagerId",
  authenticate,
  validate({ params: z.object({ wagerId: z.string().uuid() }) }),
  requirePermission(Permission.PRODUCTION_ENTRY),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.getWagerContext(
        authReq.user.tenantId,
        req.params.wagerId as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/production-returns
router.post(
  "/",
  authenticate,
  validate({ body: createProductionReturnSchema }),
  requirePermission(Permission.PRODUCTION_ENTRY),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.create(
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

// GET /api/production-returns
router.get(
  "/",
  authenticate,
  validate({ query: productionReturnListQuerySchema }),
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

export const productionReturnRoutes = router;
