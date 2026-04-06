import { Router } from "express";
import { container } from "../container.js";
import { resolveGetAllReferralFilter } from "../middleware/referral.middleware.js";
import { authorize, protect } from "../security/auth.middleware.js";
import { UserRole } from "../types/roles.types.js";

const router = Router({ mergeParams: true });

router.get(
  "/",
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER, UserRole.NURSE),
  resolveGetAllReferralFilter,
  (req, res) => container.referralController.getReferrals(req, res),
);

// GET /referrals/upcoming - List upcoming referral visits (by scheduledVisitDate) for the logged-in social health worker
router.get(
  "/upcoming",
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER),
  resolveGetAllReferralFilter,
  (req, res, next) =>
    container.referralController.getUpcomingReferralsIn48(req, res, next),
);

// GET /referrals/metrics - Get referral metrics for the current referral scope
router.get(
  "/metrics",
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER, UserRole.NURSE),
  resolveGetAllReferralFilter,
  (req, res) => container.referralController.getReferralMetrics(req, res),
);

export default router;
