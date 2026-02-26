import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { UserRole } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import { paginationSchema } from "../../shared/schemas.js";
import {
  createTenantSchema,
  createTenantWithOwnerSchema,
  updateTenantSchema,
  updateTenantStatusSchema,
  updateTenantSettingsSchema,
  tenantListQuerySchema,
} from "./tenant.schema.js";
import { TenantService } from "./tenant.service.js";

const router: IRouter = Router();
const tenantService = new TenantService();

// POST /api/tenants - Create tenant (Super Admin only)
router.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validate({ body: createTenantSchema }),
  async (req, res, next) => {
    try {
      const tenant = await tenantService.create(req.body);
      res.status(201).json({ data: tenant });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/tenants - List tenants (Super Admin only)
router.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validate({ query: tenantListQuerySchema }),
  async (req, res, next) => {
    try {
      const { search, status, ...pagination } = req.query as any;
      const result = await tenantService.findAll(pagination, { search, status });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/tenants/with-owner - Create tenant with owner (Super Admin only)
router.post(
  "/with-owner",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validate({ body: createTenantWithOwnerSchema }),
  async (req, res, next) => {
    try {
      const tenant = await tenantService.createWithOwner(req.body);
      res.status(201).json({ data: tenant });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/tenants/:id - Get tenant
router.get(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      // Owners can only view their own tenant
      if (
        authReq.user.role === UserRole.OWNER &&
        authReq.user.tenantId !== (req.params.id as string)
      ) {
        res.status(403).json({
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
        return;
      }
      const tenant = await tenantService.findById(req.params.id as string);
      res.json({ data: tenant });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/tenants/:id - Update tenant
router.put(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER),
  validate({ body: updateTenantSchema }),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      if (
        authReq.user.role === UserRole.OWNER &&
        authReq.user.tenantId !== (req.params.id as string)
      ) {
        res.status(403).json({
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
        return;
      }
      const tenant = await tenantService.update(
        req.params.id as string,
        req.body,
      );
      res.json({ data: tenant });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/tenants/:id/status - Update tenant status (Super Admin only)
router.put(
  "/:id/status",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validate({ body: updateTenantStatusSchema }),
  async (req, res, next) => {
    try {
      const tenant = await tenantService.updateStatus(
        req.params.id as string,
        req.body.status,
      );
      res.json({ data: tenant });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/tenants/:id/settings
router.get(
  "/:id/settings",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      if (
        authReq.user.role !== UserRole.SUPER_ADMIN &&
        authReq.user.tenantId !== (req.params.id as string)
      ) {
        res.status(403).json({
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
        return;
      }
      const settings = await tenantService.getSettings(req.params.id as string);
      res.json({ data: settings });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/tenants/:id/settings
router.put(
  "/:id/settings",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER),
  validate({ body: updateTenantSettingsSchema }),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      if (
        authReq.user.role !== UserRole.SUPER_ADMIN &&
        authReq.user.tenantId !== (req.params.id as string)
      ) {
        res.status(403).json({
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
        return;
      }
      const settings = await tenantService.updateSettings(
        req.params.id as string,
        req.body,
      );
      res.json({ data: settings });
    } catch (err) {
      next(err);
    }
  },
);

export const tenantRoutes = router;
