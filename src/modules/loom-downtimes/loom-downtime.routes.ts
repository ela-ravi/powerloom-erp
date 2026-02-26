import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createLoomDowntimeSchema,
  updateLoomDowntimeSchema,
  loomDowntimeListQuerySchema,
} from "./loom-downtime.schema.js";
import { LoomDowntimeService } from "./loom-downtime.service.js";

const router: IRouter = Router();
const service = new LoomDowntimeService();

// POST /api/loom-downtimes
router.post(
  "/",
  authenticate,
  validate({ body: createLoomDowntimeSchema }),
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

// PUT /api/loom-downtimes/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updateLoomDowntimeSchema }),
  requirePermission(Permission.PRODUCTION_ENTRY),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.update(
        authReq.user.tenantId,
        req.params.id as string,
        req.body,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/loom-downtimes
router.get(
  "/",
  authenticate,
  validate({ query: loomDowntimeListQuerySchema }),
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

export const loomDowntimeRoutes = router;
