import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createShiftSchema,
  updateShiftSchema,
  shiftListQuerySchema,
} from "./shift.schema.js";
import { ShiftService } from "./shift.service.js";

const router: IRouter = Router();
const service = new ShiftService();

// POST /api/shifts
router.post(
  "/",
  authenticate,
  validate({ body: createShiftSchema }),
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

// PUT /api/shifts/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updateShiftSchema }),
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

// GET /api/shifts
router.get(
  "/",
  authenticate,
  validate({ query: shiftListQuerySchema }),
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

export const shiftRoutes = router;
