import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { UserRole } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createInviteSchema,
  inviteListQuerySchema,
} from "./invite.schema.js";
import { InviteService } from "./invite.service.js";

const router: IRouter = Router();
const inviteService = new InviteService();

// POST /api/invites - Create invite code (Owner/Staff)
router.post(
  "/",
  authenticate,
  authorize(UserRole.OWNER, UserRole.STAFF),
  tenantScope,
  validate({ body: createInviteSchema }),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const invite = await inviteService.create(
        authReq.user.tenantId,
        authReq.user.id,
        req.body,
      );
      res.status(201).json({ data: invite });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/invites - List tenant's invite codes (Owner/Staff)
router.get(
  "/",
  authenticate,
  authorize(UserRole.OWNER, UserRole.STAFF),
  tenantScope,
  validate({ query: inviteListQuerySchema }),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await inviteService.findAll(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/invites/:id/deactivate - Deactivate invite code (Owner/Staff)
router.put(
  "/:id/deactivate",
  authenticate,
  authorize(UserRole.OWNER, UserRole.STAFF),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const invite = await inviteService.deactivate(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: invite });
    } catch (err) {
      next(err);
    }
  },
);

export const inviteRoutes = router;
