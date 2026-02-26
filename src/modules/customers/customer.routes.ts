import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { validate } from "../../middleware/validate.js";
import { Permission } from "../../types/enums.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerListQuerySchema,
  bulkUpsertCustomerProductPricesSchema,
} from "./customer.schema.js";
import { CustomerService } from "./customer.service.js";

const router: IRouter = Router();
const service = new CustomerService();

// POST /api/customers
router.post(
  "/",
  authenticate,
  validate({ body: createCustomerSchema }),
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

// GET /api/customers
router.get(
  "/",
  authenticate,
  validate({ query: customerListQuerySchema }),
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

// PUT /api/customers/:id
router.put(
  "/:id",
  authenticate,
  validate({ body: updateCustomerSchema }),
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

// GET /api/customers/:id/product-prices
router.get(
  "/:id/product-prices",
  authenticate,
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.listProductPrices(
        authReq.user.tenantId,
        req.params.id as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/customers/:id/product-prices
router.put(
  "/:id/product-prices",
  authenticate,
  validate({ body: bulkUpsertCustomerProductPricesSchema }),
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.bulkUpsertProductPrices(
        authReq.user.tenantId,
        req.params.id as string,
        req.body.prices,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/customers/:id/product-prices/:priceId
router.delete(
  "/:id/product-prices/:priceId",
  authenticate,
  requirePermission(Permission.MASTER_DATA),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await service.deleteProductPrice(
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

// GET /api/customers/:customerId/product-prices/by-product/:productId
router.get(
  "/:customerId/product-prices/by-product/:productId",
  authenticate,
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await service.getProductPriceByProduct(
        authReq.user.tenantId,
        req.params.customerId as string,
        req.params.productId as string,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const customerRoutes = router;
