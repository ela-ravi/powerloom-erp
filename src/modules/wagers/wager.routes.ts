import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { UserRole } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createWagerSchema,
  updateWagerSchema,
  wagerListQuerySchema,
  performanceQuerySchema,
  rankingQuerySchema,
} from "./wager.schema.js";
import { WagerService } from "./wager.service.js";

const router: IRouter = Router();
const service = new WagerService();

// POST /api/wagers
router.post(
  "/",
  authenticate,
  validate({ body: createWagerSchema }),
  authorize(UserRole.OWNER),
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

// GET /api/wagers
router.get(
  "/",
  authenticate,
  validate({ query: wagerListQuerySchema }),
  authorize(UserRole.OWNER, UserRole.STAFF),
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

// GET /api/wagers/ranking
router.get(
  "/ranking",
  authenticate,
  validate({ query: rankingQuerySchema }),
  authorize(UserRole.OWNER, UserRole.STAFF),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = req.query as any;
      const result = await service.getRanking(authReq.user.tenantId, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/wagers/:id/performance
router.get(
  "/:id/performance",
  authenticate,
  validate({ query: performanceQuerySchema }),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = req.query as any;
      const result = await service.getPerformance(
        authReq.user.tenantId,
        req.params.id as string,
        query,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/wagers/:id
router.get("/:id", authenticate, tenantScope, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const profile = await service.findById(
      authReq.user.tenantId,
      req.params.id as string,
    );

    // Wagers can only view their own profile
    if (
      authReq.user.role === UserRole.WAGER &&
      profile.userId !== authReq.user.id
    ) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Access denied" },
      });
      return;
    }

    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// PUT /api/wagers/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updateWagerSchema }),
  authorize(UserRole.OWNER),
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

// DELETE /api/wagers/:id
router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.OWNER),
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

export const wagerRoutes = router;
