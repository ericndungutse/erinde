import { Router } from "express";
import { container } from "../container.js";
import { protect, authorize } from "../security/auth.middleware.js";
import { UserRole } from "../types/roles.types.js";

const router = Router();

//TODO: Move it back to referral routes, add middleware to narrow down to ensure nurse or SHW only gets referrals assigned to them. For now, we can keep it here to avoid conflicts with the ongoing referral route refactor.
// GET /nurse/referrals/:id - Get single referral details (nurse only)
router.get("/referrals/:id", protect, authorize(UserRole.NURSE), (req, res) =>
  container.referralController.getReferralById(req, res),
);

export default router;
