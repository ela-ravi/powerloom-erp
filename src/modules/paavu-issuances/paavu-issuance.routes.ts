import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createPaavuIssuanceSchema,
  paavuIssuanceListQuerySchema,
} from "./paavu-issuance.schema.js";
import { PaavuIssuanceService } from "./paavu-issuance.service.js";

const router: IRouter = Router();
const service = new PaavuIssuanceService();

// GET /api/paavu-issuances/eligible-wagers
router.get(
  "/eligible-wagers",
  authenticate,
  requirePermission(Permission.PRODUCTION_ENTRY),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.getEligibleWagers(authReq.user.tenantId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/paavu-issuances/wager-summary/:wagerId
router.get(
  "/wager-summary/:wagerId",
  authenticate,
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.getWagerPaavuSummary(
        authReq.user.tenantId,
        req.params.wagerId as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/paavu-issuances
router.post(
  "/",
  authenticate,
  validate({ body: createPaavuIssuanceSchema }),
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

// GET /api/paavu-issuances
router.get(
  "/",
  authenticate,
  validate({ query: paavuIssuanceListQuerySchema }),
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

// GET /api/paavu-issuances/:id
router.get(
  "/:id",
  authenticate,
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.findById(
        authReq.user.tenantId,
        req.params.id,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const paavuIssuanceRoutes = router;
