import { Router } from 'express';
import { container } from '../container.js';
import { protect, authorize } from '../security/auth.middleware.js';
import { AccountRole } from '../types/user.types.js';

const router = Router();

// GET /referrals/me - List referrals for patients under the logged-in health worker's follow-up
router.get('/me', protect, authorize(AccountRole.SOCIAL_HEALTH_WORKER), (req, res) =>
  container.referralController.listMyReferrals(req, res),
);

// GET /referrals/upcoming - List upcoming referral visits (by scheduledVisitDate) for the logged-in social health worker
router.get('/upcoming', protect, authorize(AccountRole.SOCIAL_HEALTH_WORKER), (req, res) =>
  container.referralController.listMyUpcomingReferrals(req, res),
);

// GET /referrals/pending/count - Get count of pending referrals for the logged-in social health worker
router.get('/pending/count', protect, authorize(AccountRole.SOCIAL_HEALTH_WORKER), (req, res) =>
  container.referralController.countMyPendingReferrals(req, res),
);

// GET /referrals/status/overview - Get referral status overview for the logged-in social health worker
router.get('/status/overview', protect, authorize(AccountRole.SOCIAL_HEALTH_WORKER), (req, res) =>
  container.referralController.getMyReferralStatusOverview(req, res),
);

// GET /referrals/:id - Get single referral details
router.get('/:id', protect, authorize(AccountRole.SOCIAL_HEALTH_WORKER), (req, res) =>
  container.referralController.getReferralById(req, res),
);

// POST /referrals/complete/:patientNumber - Nurse completes latest pending referral by patient number
router.patch('/complete/:patientNumber', protect, authorize(AccountRole.NURSE), (req, res) =>
  container.referralController.completeReferralByPatientNumber(req, res),
);

export default router;
