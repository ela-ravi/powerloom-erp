import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createDamageRecordSchema,
  damageRecordListQuerySchema,
} from "./damage-record.schema.js";
import { DamageRecordService } from "./damage-record.service.js";

const router: IRouter = Router();
const service = new DamageRecordService();

// POST /api/damage-records
router.post(
  "/",
  authenticate,
  validate({ body: createDamageRecordSchema }),
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

// GET /api/damage-records
router.get(
  "/",
  authenticate,
  validate({ query: damageRecordListQuerySchema }),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.findAll(
        authReq.user.tenantId,
        req.query as any,
        authReq.user.role,
        authReq.user.id,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/damage-records/:id
router.get("/:id", authenticate, tenantScope, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await service.findById(
      authReq.user.tenantId,
      req.params.id as string,
      authReq.user.role,
      authReq.user.id,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// PUT /api/damage-records/:id/approve
router.put(
  "/:id/approve",
  authenticate,
  requirePermission(Permission.DAMAGE_APPROVAL),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.approve(
        authReq.user.tenantId,
        req.params.id as string,
        authReq.user.id,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/damage-records/:id/reject
router.put(
  "/:id/reject",
  authenticate,
  requirePermission(Permission.DAMAGE_APPROVAL),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.reject(
        authReq.user.tenantId,
        req.params.id as string,
        authReq.user.id,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const damageRecordRoutes = router;
