import { Router } from 'express';
import { container } from '../container.js';
import { protect, authorize } from '../security/auth.middleware.js';
import { AccountRole } from '../types/user.types.js';

const router = Router();

// GET /referrals/me - List referrals for patients under the logged-in health worker's follow-up
router.get('/me', protect, authorize(AccountRole.SOCIAL_HEALTH_WORKER), (req, res) =>
  container.referralController.listMyReferrals(req, res)
);

// GET /referrals/:id - Get single referral details
router.get('/:id', protect, authorize(AccountRole.SOCIAL_HEALTH_WORKER), (req, res) =>
  container.referralController.getReferralById(req, res)
);

export default router;
