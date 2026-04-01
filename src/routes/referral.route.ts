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

// TODO: Next
// GET /referrals/pending/count - Get count of pending referrals for the logged-in social health worker
router.get(
  "/pending/count",
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER),
  (req, res) => container.referralController.countMyPendingReferrals(req, res),
);

// GET /referrals/status/overview - Get referral status overview for the logged-in social health worker
router.get(
  "/status/overview",
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER),
  (req, res) =>
    container.referralController.getMyReferralStatusOverview(req, res),
);

export default router;
