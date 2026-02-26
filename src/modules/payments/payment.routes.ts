import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createPaymentSchema,
  paymentListQuerySchema,
} from "./payment.schema.js";
import { PaymentService } from "./payment.service.js";

const router: IRouter = Router();
const service = new PaymentService();

// POST /api/payments
router.post(
  "/",
  authenticate,
  validate({ body: createPaymentSchema }),
  requirePermission(Permission.SALES_INVOICING),
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

// GET /api/payments
router.get(
  "/",
  authenticate,
  validate({ query: paymentListQuerySchema }),
  requirePermission(Permission.SALES_INVOICING),
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

export const paymentRoutes = router;
