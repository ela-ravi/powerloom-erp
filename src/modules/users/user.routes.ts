import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize, requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { UserRole, Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createUserSchema,
  updateUserSchema,
  setPermissionsSchema,
  userListQuerySchema,
} from "./user.schema.js";
import { UserService } from "./user.service.js";

const router: IRouter = Router();
const userService = new UserService();

// POST /api/users - Create user
router.post(
  "/",
  authenticate,
  validate({ body: createUserSchema }),
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await userService.create(authReq.user.tenantId, req.body);
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/users - List users
router.get(
  "/",
  authenticate,
  authorize(UserRole.OWNER, UserRole.STAFF),
  validate({ query: userListQuerySchema }),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await userService.findAll(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/users/:id - Get user
router.get("/:id", authenticate, tenantScope, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    // Workers can only view themselves
    const workerRoles = [UserRole.WAGER, UserRole.TAILOR, UserRole.PACKAGER, UserRole.PAAVU_OATI];
    if (
      workerRoles.includes(authReq.user.role) &&
      authReq.user.id !== (req.params.id as string)
    ) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Access denied" },
      });
      return;
    }
    const user = await userService.findById(
      authReq.user.tenantId,
      req.params.id as string,
    );
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id - Update user
router.put(
  "/:id",
  authenticate,
  validate({ body: updateUserSchema }),
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await userService.update(
        authReq.user.tenantId,
        req.params.id as string,
        req.body,
      );
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/users/:id/deactivate - Deactivate user
router.put(
  "/:id/deactivate",
  authenticate,
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await userService.deactivate(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/users/:id/reactivate - Reactivate user
router.put(
  "/:id/reactivate",
  authenticate,
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await userService.reactivate(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/users/:id/permissions - Get staff permissions
router.get(
  "/:id/permissions",
  authenticate,
  authorize(UserRole.OWNER),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await userService.getPermissions(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/users/:id/permissions - Set staff permissions
router.put(
  "/:id/permissions",
  authenticate,
  authorize(UserRole.OWNER),
  validate({ body: setPermissionsSchema }),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await userService.setPermissions(
        authReq.user.tenantId,
        req.params.id as string,
        req.body.permissions,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const userRoutes = router;
