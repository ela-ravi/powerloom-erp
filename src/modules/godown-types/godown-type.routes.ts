import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createGodownTypeSchema,
  updateGodownTypeSchema,
} from "./godown-type.schema.js";
import { GodownTypeService } from "./godown-type.service.js";

const router: IRouter = Router();
const service = new GodownTypeService();

// POST /api/godown-types
router.post(
  "/",
  authenticate,
  validate({ body: createGodownTypeSchema }),
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

// GET /api/godown-types
router.get(
  "/",
  authenticate,
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.findAll(authReq.user.tenantId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/godown-types/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updateGodownTypeSchema }),
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

// DELETE /api/godown-types/:id
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

export const godownTypeRoutes = router;
