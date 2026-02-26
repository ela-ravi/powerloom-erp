import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import { logger } from "../../config/logger.js";
import {
  createTransferSchema,
  transferListQuerySchema,
} from "./transfer.schema.js";
import { TransferService } from "./transfer.service.js";

const router: IRouter = Router();
const service = new TransferService();

// POST /api/transfers
router.post(
  "/",
  authenticate,
  validate({ body: createTransferSchema }),
  requirePermission(Permission.GODOWN_MANAGEMENT),
  tenantScope,
  async (req, res, next) => {
    try {
      logger.info({ body: req.body }, "Transfer create request");
      const authReq = req as AuthenticatedRequest;
      const result = await service.create(
        authReq.user.tenantId,
        authReq.user.id,
        req.body,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      logger.error({ err, body: req.body }, "Transfer create failed");
      next(err);
    }
  },
);

// GET /api/transfers
router.get(
  "/",
  authenticate,
  validate({ query: transferListQuerySchema }),
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

export const transferRoutes = router;
