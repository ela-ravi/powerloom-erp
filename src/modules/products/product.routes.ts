import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createProductSchema,
  updateProductSchema,
  productListQuerySchema,
  createColorPriceSchema,
  updateColorPriceSchema,
  createShiftRateSchema,
  updateShiftRateSchema,
} from "./product.schema.js";
import { ProductService } from "./product.service.js";

const router: IRouter = Router();
const service = new ProductService();

// POST /api/products
router.post(
  "/",
  authenticate,
  validate({ body: createProductSchema }),
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.create(authReq.user.tenantId, req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/products
router.get(
  "/",
  authenticate,
  validate({ query: productListQuerySchema }),
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

// PUT /api/products/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updateProductSchema }),
  requirePermission(Permission.MASTER_DATA),
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

// --- Color Prices ---

// POST /api/products/:id/color-prices
router.post(
  "/:id/color-prices",
  authenticate,
  validate({ body: createColorPriceSchema }),
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.addColorPrice(
        authReq.user.tenantId,
        req.params.id as string,
        req.body,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/products/:id/color-prices
router.get(
  "/:id/color-prices",
  authenticate,
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.listColorPrices(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/products/:id/color-prices/:priceId
router.put(
  "/:id/color-prices/:priceId",
  authenticate,
  validate({ body: updateColorPriceSchema }),
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.updateColorPrice(
        authReq.user.tenantId,
        req.params.id as string,
        req.params.priceId as string,
        req.body,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/products/:id/color-prices/:priceId
router.delete(
  "/:id/color-prices/:priceId",
  authenticate,
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await service.deleteColorPrice(
        authReq.user.tenantId,
        req.params.id as string,
        req.params.priceId as string,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// --- Shift Wage Rates ---

// POST /api/products/:id/shift-rates
router.post(
  "/:id/shift-rates",
  authenticate,
  validate({ body: createShiftRateSchema }),
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.addShiftRate(
        authReq.user.tenantId,
        req.params.id as string,
        req.body,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/products/:id/shift-rates
router.get(
  "/:id/shift-rates",
  authenticate,
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.listShiftRates(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/products/:id/shift-rates/:rateId
router.put(
  "/:id/shift-rates/:rateId",
  authenticate,
  validate({ body: updateShiftRateSchema }),
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.updateShiftRate(
        authReq.user.tenantId,
        req.params.id as string,
        req.params.rateId as string,
        req.body,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/products/:id
router.delete(
  "/:id",
  authenticate,
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await service.delete(authReq.user.tenantId, req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export const productRoutes = router;
