import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { UserRole } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createPaavuOatiSchema,
  updatePaavuOatiSchema,
  paavuOatiListQuerySchema,
} from "./paavu-oati.schema.js";
import { PaavuOatiService } from "./paavu-oati.service.js";

const router: IRouter = Router();
const service = new PaavuOatiService();

// POST /api/paavu-oatis
router.post(
  "/",
  authenticate,
  validate({ body: createPaavuOatiSchema }),
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

// GET /api/paavu-oatis
router.get(
  "/",
  authenticate,
  validate({ query: paavuOatiListQuerySchema }),
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

// GET /api/paavu-oatis/:id
router.get("/:id", authenticate, tenantScope, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const profile = await service.findById(
      authReq.user.tenantId,
      req.params.id as string,
    );

    // Paavu Oati workers can only view their own profile
    if (
      authReq.user.role === UserRole.PAAVU_OATI &&
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

// PUT /api/paavu-oatis/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updatePaavuOatiSchema }),
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

// DELETE /api/paavu-oatis/:id
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

export const paavuOatiRoutes = router;
