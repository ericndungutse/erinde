import { Router } from "express";
import { container } from "../container.js";
import { resolveSourceFilter } from "../middleware/referral.middleware.js";
import { authorize, protect } from "../security/auth.middleware.js";
import { UserRole } from "../types/roles.types.js";

const router = Router({ mergeParams: true });

// Get All Refferral with only from. This is used for listing referrals for the logged-in user based on their source scope (e.g. hospital or community health unit)
// Get all Referrals with to. This is used for listing referrals for the logged-in user based on their destination scope (e.g. hospital or clinic) (Allow Nurse role to access referrals where to = hospitalId)
router.get(
  "/",
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER, UserRole.NURSE),
  resolveSourceFilter,
  (req, res) => container.referralController.getReferrals(req, res),
);

// GET /referrals/upcoming - List upcoming referral visits (by scheduledVisitDate) for the logged-in social health worker
router.get(
  "/upcoming",
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER),
  resolveSourceFilter,
  (req, res, next) =>
    container.referralController.getUpcomingReferralsIn48(req, res, next),
);

// GET /referrals/metrics - Get referral metrics for the current referral scope
router.get(
  "/metrics",
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER, UserRole.NURSE),
  resolveSourceFilter,
  (req, res) => container.referralController.getReferralMetrics(req, res),
);

// // Get Referral by patient number
router.get(
  "/patient/:patientNumber",
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER, UserRole.NURSE),
  resolveSourceFilter,
  (req, res, next) =>
    container.referralController.getReferralByPatientNumber(req, res, next),
);

export default router;
