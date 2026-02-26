import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize, requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { UserRole, Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  generateWageCycleSchema,
  wageCycleListQuerySchema,
  setDiscretionarySchema,
} from "./wage-cycle.schema.js";
import { WageCycleService } from "./wage-cycle.service.js";

const router: IRouter = Router();
const service = new WageCycleService();

// POST /api/wage-cycles/generate
router.post(
  "/generate",
  authenticate,
  validate({ body: generateWageCycleSchema }),
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.generate(
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

// GET /api/wage-cycles
router.get(
  "/",
  authenticate,
  validate({ query: wageCycleListQuerySchema }),
  requirePermission(Permission.WAGE_PROCESSING),
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

// GET /api/wage-cycles/worker/me (must be before /:id to avoid route collision)
router.get("/worker/me", authenticate, tenantScope, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await service.getWorkerWages(
      authReq.user.tenantId,
      authReq.user.id,
      req.query as any,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/wage-cycles/discretionary (must be before /:id)
router.put(
  "/discretionary",
  authenticate,
  validate({ body: setDiscretionarySchema }),
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.setDiscretionary(
        authReq.user.tenantId,
        req.body.wageRecordId,
        req.body.amount,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/wage-cycles/:id
router.get(
  "/:id",
  authenticate,
  requirePermission(Permission.WAGE_PROCESSING),
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

// PUT /api/wage-cycles/:id/review
router.put(
  "/:id/review",
  authenticate,
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.transition(
        authReq.user.tenantId,
        req.params.id as string,
        "review",
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/wage-cycles/:id/approve
router.put(
  "/:id/approve",
  authenticate,
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.transition(
        authReq.user.tenantId,
        req.params.id as string,
        "approved",
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/wage-cycles/:id/pay
router.put(
  "/:id/pay",
  authenticate,
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.transition(
        authReq.user.tenantId,
        req.params.id as string,
        "paid",
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const wageCycleRoutes = router;
