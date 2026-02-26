import { Router, type IRouter } from "express";
import { validate } from "../../middleware/validate.js";
import {
  registrationOtpSendSchema,
  registerTenantSchema,
} from "./registration.schema.js";
import {
  validateInviteCodeSchema,
  inviteOtpSendSchema,
  redeemInviteSchema,
} from "../invites/invite.schema.js";
import { RegistrationService } from "./registration.service.js";
import { InviteService } from "../invites/invite.service.js";

const router: IRouter = Router();
const registrationService = new RegistrationService();
const inviteService = new InviteService();

// POST /api/register/otp/send — Send OTP for tenant registration (public)
router.post(
  "/otp/send",
  validate({ body: registrationOtpSendSchema }),
  async (req, res, next) => {
    try {
      const result = await registrationService.sendRegistrationOtp(
        req.body.phone,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/register/tenant — Create tenant + owner (public)
router.post(
  "/tenant",
  validate({ body: registerTenantSchema }),
  async (req, res, next) => {
    try {
      const result = await registrationService.registerTenant(req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/register/invite/:code — Validate invite code (public)
router.get(
  "/invite/:code",
  async (req, res, next) => {
    try {
      const result = await inviteService.validateCode(req.params.code as string);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/register/invite/otp/send — Send OTP for invite registration (public)
router.post(
  "/invite/otp/send",
  validate({ body: inviteOtpSendSchema }),
  async (req, res, next) => {
    try {
      const result = await inviteService.sendInviteOtp(
        req.body.code,
        req.body.phone,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/register/invite — Redeem invite code (public)
router.post(
  "/invite",
  validate({ body: redeemInviteSchema }),
  async (req, res, next) => {
    try {
      const result = await inviteService.redeem(req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const registrationRoutes = router;
