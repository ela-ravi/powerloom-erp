import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { UserRole } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  upsertProductOodaiWeightSchema,
  bulkUpsertProductOodaiWeightSchema,
} from "./product-oodai-weight.schema.js";
import { ProductOodaiWeightService } from "./product-oodai-weight.service.js";

const router: IRouter = Router();
const service = new ProductOodaiWeightService();

// GET /api/product-oodai-weights
router.get(
  "/",
  authenticate,
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.findAll(authReq.user.tenantId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/product-oodai-weights (single upsert)
router.put(
  "/",
  authenticate,
  validate({ body: upsertProductOodaiWeightSchema }),
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.upsert(authReq.user.tenantId, req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/product-oodai-weights/bulk (bulk upsert)
router.put(
  "/bulk",
  authenticate,
  validate({ body: bulkUpsertProductOodaiWeightSchema }),
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.bulkUpsert(
        authReq.user.tenantId,
        req.body.items,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/product-oodai-weights/:productId
router.delete(
  "/:productId",
  authenticate,
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await service.delete(authReq.user.tenantId, req.params.productId as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export const productOodaiWeightRoutes = router;
