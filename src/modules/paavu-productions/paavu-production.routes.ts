import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createPaavuProductionSchema,
  updatePaavuProductionSchema,
  paavuProductionListQuerySchema,
} from "./paavu-production.schema.js";
import { PaavuProductionService } from "./paavu-production.service.js";

const router: IRouter = Router();
const service = new PaavuProductionService();

// GET /api/paavu-productions/eligible-workers
router.get(
  "/eligible-workers",
  authenticate,
  requirePermission(Permission.PRODUCTION_ENTRY),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const data = await service.getEligibleWorkers(authReq.user.tenantId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/paavu-productions
router.post(
  "/",
  authenticate,
  validate({ body: createPaavuProductionSchema }),
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

// PUT /api/paavu-productions/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updatePaavuProductionSchema }),
  requirePermission(Permission.PRODUCTION_ENTRY),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.update(
        authReq.user.tenantId,
        req.params.id,
        authReq.user.id,
        req.body,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/paavu-productions/:id
router.delete(
  "/:id",
  authenticate,
  requirePermission(Permission.PRODUCTION_ENTRY),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await service.delete(authReq.user.tenantId, req.params.id);
      res.json({ data: { message: "Paavu production deleted" } });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/paavu-productions
router.get(
  "/",
  authenticate,
  validate({ query: paavuProductionListQuerySchema }),
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

export const paavuProductionRoutes = router;
