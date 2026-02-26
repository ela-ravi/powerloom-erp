import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  productionSummaryQuerySchema,
  profitabilityQuerySchema,
  wagerDamageQuerySchema,
  dateRangeQuerySchema,
  stockQuerySchema,
  stockMovementQuerySchema,
  gstSummaryQuerySchema,
  supplierLedgerQuerySchema,
  revenueQuerySchema,
  downtimeQuerySchema,
  shiftProductionQuerySchema,
} from "./report.schema.js";
import { ReportService } from "./report.service.js";

const router: IRouter = Router();
const service = new ReportService();

// Production Reports

// GET /api/reports/production-summary
router.get(
  "/production-summary",
  authenticate,
  validate({ query: productionSummaryQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.productionSummary(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/batch-profitability
router.get(
  "/batch-profitability",
  authenticate,
  validate({ query: profitabilityQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.batchProfitability(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/color-profitability
router.get(
  "/color-profitability",
  authenticate,
  validate({ query: profitabilityQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.colorProfitability(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/product-profitability
router.get(
  "/product-profitability",
  authenticate,
  validate({ query: profitabilityQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.productProfitability(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// Wager Reports

// GET /api/reports/wage-sheet/:cycleId
router.get(
  "/wage-sheet/:cycleId",
  authenticate,
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.wageSheet(
        authReq.user.tenantId,
        req.params.cycleId as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/wager-damage
router.get(
  "/wager-damage",
  authenticate,
  validate({ query: wagerDamageQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.wagerDamage(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/wager-utilization
router.get(
  "/wager-utilization",
  authenticate,
  validate({ query: dateRangeQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.wagerUtilization(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/wager-advance
router.get(
  "/wager-advance",
  authenticate,
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.wagerAdvance(authReq.user.tenantId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// Inventory Reports

// GET /api/reports/cone-stock
router.get(
  "/cone-stock",
  authenticate,
  validate({ query: stockQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.coneStock(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/finished-stock
router.get(
  "/finished-stock",
  authenticate,
  validate({ query: stockQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.finishedStock(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/stock-movement
router.get(
  "/stock-movement",
  authenticate,
  validate({ query: stockMovementQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.stockMovement(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// Finance Reports

// GET /api/reports/gst-summary
router.get(
  "/gst-summary",
  authenticate,
  validate({ query: gstSummaryQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.gstSummary(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/supplier-ledger
router.get(
  "/supplier-ledger",
  authenticate,
  validate({ query: supplierLedgerQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.supplierLedger(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/revenue
router.get(
  "/revenue",
  authenticate,
  validate({ query: revenueQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.revenue(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/customer-aging
router.get(
  "/customer-aging",
  authenticate,
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.customerAging(authReq.user.tenantId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/downtime
router.get(
  "/downtime",
  authenticate,
  validate({ query: downtimeQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.downtimeReport(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reports/shift-production
router.get(
  "/shift-production",
  authenticate,
  validate({ query: shiftProductionQuerySchema }),
  requirePermission(Permission.REPORTS),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.shiftProduction(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const reportRoutes = router;
