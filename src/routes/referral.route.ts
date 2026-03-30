import { Router } from "express";
import { container } from "../container.js";
import { protect, authorize } from "../security/auth.middleware.js";
import { UserRole } from "../types/roles.types.js";
import { ModelNames } from "../constants/constant.values.js";

const router = Router({ mergeParams: true });

router.get(
  "/",
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER),
  (req, res, next) => {
    const referralFilter: any = {
      
    };
    const userRoles = req.user?.roles || [];

    console.log("User Roles:", req.user); // Debugging line to check user roles

    if (userRoles.includes(UserRole.SOCIAL_HEALTH_WORKER)) {
      referralFilter['from'] = req.user?.managedCommunityHealthUnit;
      referralFilter['fromType'] = ModelNames.CommunityHealthUnit;
    }

    req.referralFilter = referralFilter; 

    next();
  },
  (req, res) =>
    container.referralController.getReferralsByCommunityHealthUnit(req, res),
);

// GET /referrals/upcoming - List upcoming referral visits (by scheduledVisitDate) for the logged-in social health worker
router.get(
  "/upcoming",
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER),
  (req, res) => container.referralController.listMyUpcomingReferrals(req, res),
);

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
