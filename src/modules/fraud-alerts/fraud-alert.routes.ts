import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { UserRole } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import { fraudAlertListQuerySchema } from "./fraud-alert.schema.js";
import { FraudAlertService } from "./fraud-alert.service.js";

const router: IRouter = Router();
const service = new FraudAlertService();

// GET /api/fraud-alerts
router.get(
  "/",
  authenticate,
  validate({ query: fraudAlertListQuerySchema }),
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

// PUT /api/fraud-alerts/:id/resolve
router.put(
  "/:id/resolve",
  authenticate,
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.resolve(
        authReq.user.tenantId,
        req.params.id as string,
        authReq.user.id,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const fraudAlertRoutes = router;
