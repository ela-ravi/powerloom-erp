import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceListQuerySchema,
} from "./invoice.schema.js";
import { InvoiceService } from "./invoice.service.js";

const router: IRouter = Router();
const service = new InvoiceService();

// POST /api/invoices
router.post(
  "/",
  authenticate,
  validate({ body: createInvoiceSchema }),
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

// GET /api/invoices
router.get(
  "/",
  authenticate,
  validate({ query: invoiceListQuerySchema }),
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

// GET /api/invoices/customer/:customerId/statement (must be before /:id to avoid collision)
router.get(
  "/customer/:customerId/statement",
  authenticate,
  requirePermission(Permission.SALES_INVOICING),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.getCustomerStatement(
        authReq.user.tenantId,
        req.params.customerId as string,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/invoices/:id
router.get(
  "/:id",
  authenticate,
  requirePermission(Permission.SALES_INVOICING),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.findById(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/invoices/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updateInvoiceSchema }),
  requirePermission(Permission.SALES_INVOICING),
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

// PUT /api/invoices/:id/issue
router.put(
  "/:id/issue",
  authenticate,
  requirePermission(Permission.SALES_INVOICING),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.issue(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/invoices/:id/cancel
router.put(
  "/:id/cancel",
  authenticate,
  requirePermission(Permission.SALES_INVOICING),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.cancel(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/invoices/:id/eway-bill
router.get(
  "/:id/eway-bill",
  authenticate,
  requirePermission(Permission.SALES_INVOICING),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.getEwayBill(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const invoiceRoutes = router;
