import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierListQuerySchema,
} from "./supplier.schema.js";
import { SupplierService } from "./supplier.service.js";

const router: IRouter = Router();
const service = new SupplierService();

// POST /api/suppliers
router.post(
  "/",
  authenticate,
  validate({ body: createSupplierSchema }),
  requirePermission(Permission.MASTER_DATA),
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

// GET /api/suppliers
router.get(
  "/",
  authenticate,
  validate({ query: supplierListQuerySchema }),
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

// PUT /api/suppliers/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updateSupplierSchema }),
  requirePermission(Permission.MASTER_DATA),
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

// DELETE /api/suppliers/:id
router.delete(
  "/:id",
  authenticate,
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await service.delete(authReq.user.tenantId, req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export const supplierRoutes = router;
