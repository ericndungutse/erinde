import { Router } from 'express';
import { container } from '../container.js';
import { protect, authorize } from '../security/auth.middleware.js';
import { UserRole } from '../types/roles.types.js';

const router = Router();

// GET /nurse/referrals - List referrals for logged-in nurse's hospital
router.get('/referrals', protect, authorize(UserRole.NURSE), (req, res) =>
  container.referralController.listMyHospitalReferrals(req, res),
);

// GET /nurse/referrals/:id - Get single referral details (nurse only)
router.get('/referrals/:id', protect, authorize(UserRole.NURSE), (req, res) =>
  container.referralController.getReferralById(req, res),
);

// PATCH /nurse/referrals/complete/:patientNumber - Nurse completes latest pending referral by patient number
router.patch('/referrals/complete/:patientNumber', protect, authorize(UserRole.NURSE), (req, res) =>
  container.referralController.completeReferralByPatientNumber(req, res),
);

export default router;
