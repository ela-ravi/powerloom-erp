import { Router, type IRouter } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import type { AuthenticatedRequest } from "../../types/api.js";
import {
  otpSendSchema,
  otpVerifySchema,
  pinVerifySchema,
  pinSetSchema,
  refreshTokenSchema,
} from "./auth.schema.js";
import { AuthService } from "./auth.service.js";
import { registerToken } from "../../shared/push.js";

const router: IRouter = Router();
const authService = new AuthService();

// POST /api/auth/otp/send - Send OTP (Public)
router.post(
  "/otp/send",
  validate({ body: otpSendSchema }),
  async (req, res, next) => {
    try {
      const result = await authService.sendOtp(req.body.phone);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/otp/verify - Verify OTP (Public)
router.post(
  "/otp/verify",
  validate({ body: otpVerifySchema }),
  async (req, res, next) => {
    try {
      const result = await authService.verifyOtp(req.body.phone, req.body.code);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/pin/verify - Verify PIN (Public)
router.post(
  "/pin/verify",
  validate({ body: pinVerifySchema }),
  async (req, res, next) => {
    try {
      const result = await authService.verifyPin(req.body.phone, req.body.pin);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/auth/pin - Set PIN (Authenticated)
router.put(
  "/pin",
  authenticate,
  validate({ body: pinSetSchema }),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await authService.setPin(authReq.user.id, req.body.pin);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/refresh - Refresh token
router.post(
  "/refresh",
  validate({ body: refreshTokenSchema }),
  async (req, res, next) => {
    try {
      const result = await authService.refreshToken(req.body.refreshToken);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/auth/me - Get current user
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await authService.getMe(
      authReq.user.id,
      authReq.user.tenantId,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/fcm-token — Register device token for push notifications
const fcmTokenSchema = z.object({ token: z.string().min(1).max(500) });
router.put(
  "/fcm-token",
  authenticate,
  validate({ body: fcmTokenSchema }),
  tenantScope,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await registerToken(
        authReq.user.tenantId,
        authReq.user.id,
        req.body.token,
      );
      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  },
);

export const authRoutes = router;
