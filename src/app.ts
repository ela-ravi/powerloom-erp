import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { tenantRoutes } from "./modules/tenants/tenant.routes.js";
import { userRoutes } from "./modules/users/user.routes.js";
import { loomTypeRoutes } from "./modules/loom-types/loom-type.routes.js";
import { loomRoutes } from "./modules/looms/loom.routes.js";
import { productRoutes } from "./modules/products/product.routes.js";
import { supplierRoutes } from "./modules/suppliers/supplier.routes.js";
import { customerRoutes } from "./modules/customers/customer.routes.js";
import { godownRoutes } from "./modules/godowns/godown.routes.js";
import { godownTypeRoutes } from "./modules/godown-types/godown-type.routes.js";
import { supplierTypeRoutes } from "./modules/supplier-types/supplier-type.routes.js";
import { wagerRoutes } from "./modules/wagers/wager.routes.js";
import { paavuOatiRoutes } from "./modules/paavu-oatis/paavu-oati.routes.js";
import { batchRoutes } from "./modules/batches/batch.routes.js";
import { conePurchaseRoutes } from "./modules/cone-purchases/cone-purchase.routes.js";
import { inventoryRoutes } from "./modules/inventory/inventory.routes.js";
import { transferRoutes } from "./modules/transfers/transfer.routes.js";
import { coneIssuanceRoutes } from "./modules/cone-issuances/cone-issuance.routes.js";
import { paavuIssuanceRoutes } from "./modules/paavu-issuances/paavu-issuance.routes.js";
import { productOodaiWeightRoutes } from "./modules/product-oodai-weights/product-oodai-weight.routes.js";
import { paavuProductionRoutes } from "./modules/paavu-productions/paavu-production.routes.js";
import { productionReturnRoutes } from "./modules/production-returns/production-return.routes.js";
import { loomDowntimeRoutes } from "./modules/loom-downtimes/loom-downtime.routes.js";
import { shiftRoutes } from "./modules/shifts/shift.routes.js";
import { damageRecordRoutes } from "./modules/damage-records/damage-record.routes.js";
import { tailoringRecordRoutes } from "./modules/tailoring-records/tailoring-record.routes.js";
import { packagingRecordRoutes } from "./modules/packaging-records/packaging-record.routes.js";
import { advanceRoutes } from "./modules/advances/advance.routes.js";
import { wageCycleRoutes } from "./modules/wage-cycles/wage-cycle.routes.js";
import { invoiceRoutes } from "./modules/invoices/invoice.routes.js";
import { paymentRoutes } from "./modules/payments/payment.routes.js";
import { notificationRoutes } from "./modules/notifications/notification.routes.js";
import { fraudAlertRoutes } from "./modules/fraud-alerts/fraud-alert.routes.js";
import { reportRoutes } from "./modules/reports/report.routes.js";
import { registrationRoutes } from "./modules/registration/registration.routes.js";
import { inviteRoutes } from "./modules/invites/invite.routes.js";
import { AppError } from "./shared/errors.js";

import type { Express } from "express";

const app: Express = express();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// API Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));

// Public routes
app.use("/api/health", healthRoutes);

// Auth routes (some public, some authenticated)
app.use("/api/auth", authRoutes);

// Public registration routes
app.use("/api/register", registrationRoutes);

// Protected routes
app.use("/api/tenants", tenantRoutes);
app.use("/api/users", userRoutes);
app.use("/api/invites", inviteRoutes);

// Phase 2: Master Data routes
app.use("/api/loom-types", loomTypeRoutes);
app.use("/api/looms", loomRoutes);
app.use("/api/products", productRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/godowns", godownRoutes);
app.use("/api/godown-types", godownTypeRoutes);
app.use("/api/supplier-types", supplierTypeRoutes);
app.use("/api/wagers", wagerRoutes);
app.use("/api/paavu-oatis", paavuOatiRoutes);
app.use("/api/product-oodai-weights", productOodaiWeightRoutes);

// Phase 3: Batch System routes
app.use("/api/batches", batchRoutes);

// Phase 4: Inventory & Raw Materials routes
app.use("/api/cone-purchases", conePurchaseRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/transfers", transferRoutes);

// Phase 5: Production System routes
app.use("/api/cone-issuances", coneIssuanceRoutes);
app.use("/api/paavu-productions", paavuProductionRoutes);
app.use("/api/paavu-issuances", paavuIssuanceRoutes);
app.use("/api/production-returns", productionReturnRoutes);
app.use("/api/loom-downtimes", loomDowntimeRoutes);
app.use("/api/shifts", shiftRoutes);

// Phase 6: Damage Management routes
app.use("/api/damage-records", damageRecordRoutes);

// Phase 7: Post-Production routes
app.use("/api/tailoring-records", tailoringRecordRoutes);
app.use("/api/packaging-records", packagingRecordRoutes);

// Phase 8: Wage & Advance routes
app.use("/api/advances", advanceRoutes);
app.use("/api/wage-cycles", wageCycleRoutes);

// Phase 9: Sales & Finance routes
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);

// Phase 10: Notifications & Alerts routes
app.use("/api/notifications", notificationRoutes);
app.use("/api/fraud-alerts", fraudAlertRoutes);

// Phase 11: Reports routes
app.use("/api/reports", reportRoutes);

// 404 handler for unmatched routes
app.use((_req, _res, next) => {
  next(AppError.notFound("Route not found"));
});

// Global error handler (must be last)
app.use(errorHandler);

export { app };
