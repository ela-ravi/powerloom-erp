import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import { notificationListQuerySchema } from "./notification.schema.js";
import { NotificationService } from "./notification.service.js";

const router: IRouter = Router();
const service = new NotificationService();

// GET /api/notifications
router.get(
  "/",
  authenticate,
  validate({ query: notificationListQuerySchema }),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.findAll(
        authReq.user.tenantId,
        authReq.user.id,
        req.query as any,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/notifications/unread-count
router.get(
  "/unread-count",
  authenticate,
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.getUnreadCount(
        authReq.user.tenantId,
        authReq.user.id,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/notifications/:id/read
router.put("/:id/read", authenticate, tenantScope, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await service.markAsRead(
      authReq.user.tenantId,
      authReq.user.id,
      req.params.id as string,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all
router.put("/read-all", authenticate, tenantScope, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await service.markAllAsRead(
      authReq.user.tenantId,
      authReq.user.id,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

export const notificationRoutes = router;
