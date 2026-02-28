import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createConePurchaseSchema,
  updateConePurchaseSchema,
  conePurchaseListQuerySchema,
} from "./cone-purchase.schema.js";
import { ConePurchaseService } from "./cone-purchase.service.js";

const router: IRouter = Router();
const service = new ConePurchaseService();

// POST /api/cone-purchases
router.post(
  "/",
  authenticate,
  validate({ body: createConePurchaseSchema }),
  requirePermission(Permission.GODOWN_MANAGEMENT),
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

// PUT /api/cone-purchases/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updateConePurchaseSchema }),
  requirePermission(Permission.GODOWN_MANAGEMENT),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.update(
        authReq.user.tenantId,
        req.params.id as string,
        authReq.user.id,
        req.body,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/cone-purchases/:id
router.delete(
  "/:id",
  authenticate,
  requirePermission(Permission.GODOWN_MANAGEMENT),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await service.delete(authReq.user.tenantId, req.params.id as string);
      res.json({ data: { message: "Cone purchase deleted" } });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/cone-purchases
router.get(
  "/",
  authenticate,
  validate({ query: conePurchaseListQuerySchema }),
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

export const conePurchaseRoutes = router;
