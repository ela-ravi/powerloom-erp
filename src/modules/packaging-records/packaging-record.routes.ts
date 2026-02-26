import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createPackagingRecordSchema,
  packagingRecordListQuerySchema,
} from "./packaging-record.schema.js";
import { PackagingRecordService } from "./packaging-record.service.js";

const router: IRouter = Router();
const service = new PackagingRecordService();

// POST /api/packaging-records
router.post(
  "/",
  authenticate,
  validate({ body: createPackagingRecordSchema }),
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

// GET /api/packaging-records
router.get(
  "/",
  authenticate,
  validate({ query: packagingRecordListQuerySchema }),
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

// GET /api/packaging-records/:id
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

export const packagingRecordRoutes = router;
