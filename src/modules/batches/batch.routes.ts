import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createBatchSchema,
  updateBatchSchema,
  updateBatchStatusSchema,
  batchListQuerySchema,
} from "./batch.schema.js";
import { BatchService } from "./batch.service.js";

const router: IRouter = Router();
const service = new BatchService();

// POST /api/batches
router.post(
  "/",
  authenticate,
  validate({ body: createBatchSchema }),
  requirePermission(Permission.PRODUCTION_ENTRY),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.create(authReq.user.tenantId, req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/batches
router.get(
  "/",
  authenticate,
  validate({ query: batchListQuerySchema }),
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

// PUT /api/batches/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updateBatchSchema }),
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

// PUT /api/batches/:id/status
router.put(
  "/:id/status",
  authenticate,
  validate({ body: updateBatchStatusSchema }),
  requirePermission(Permission.PRODUCTION_ENTRY),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.updateStatus(
        authReq.user.tenantId,
        req.params.id as string,
        req.body.status,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const batchRoutes = router;
