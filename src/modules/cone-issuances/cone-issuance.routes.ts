import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createConeIssuanceSchema,
  coneIssuanceListQuerySchema,
} from "./cone-issuance.schema.js";
import { ConeIssuanceService } from "./cone-issuance.service.js";

const router: IRouter = Router();
const service = new ConeIssuanceService();

// POST /api/cone-issuances
router.post(
  "/",
  authenticate,
  validate({ body: createConeIssuanceSchema }),
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

// GET /api/cone-issuances
router.get(
  "/",
  authenticate,
  validate({ query: coneIssuanceListQuerySchema }),
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

// GET /api/cone-issuances/:id
router.get(
  "/:id",
  authenticate,
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.findById(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const coneIssuanceRoutes = router;
