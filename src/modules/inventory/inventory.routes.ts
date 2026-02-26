import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  inventoryListQuerySchema,
  inventorySummaryQuerySchema,
  movementListQuerySchema,
  allMovementsQuerySchema,
  availableStockQuerySchema,
} from "./inventory.schema.js";
import { InventoryService } from "./inventory.service.js";

const router: IRouter = Router();
const service = new InventoryService();

// GET /api/inventory
router.get(
  "/",
  authenticate,
  validate({ query: inventoryListQuerySchema }),
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

// GET /api/inventory/summary
router.get(
  "/summary",
  authenticate,
  validate({ query: inventorySummaryQuerySchema }),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.getSummary(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/inventory/available-stock
router.get(
  "/available-stock",
  authenticate,
  validate({ query: availableStockQuerySchema }),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.getAvailableStock(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/inventory/movements (all movements across all inventory)
router.get(
  "/movements",
  authenticate,
  validate({ query: allMovementsQuerySchema }),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.getAllMovements(
        authReq.user.tenantId,
        req.query as any,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/inventory/:id/movements
router.get(
  "/:id/movements",
  authenticate,
  validate({ query: movementListQuerySchema }),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.getMovements(
        authReq.user.tenantId,
        req.params.id as string,
        req.query as any,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export const inventoryRoutes = router;
