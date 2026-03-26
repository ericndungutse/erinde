
import { Router } from 'express';
import { container } from '../container.js';
import { CreateCommunityHealthUnitSchema } from '../dto/communitHealthUnitDto.js';
import { authorize, protect } from '../security/auth.middleware.js';
import { UserRole } from '../types/roles.types.js';
import { validateBody } from '../validation/validator.js';
import referralRoute from './referral.route.js';

const router = Router();


router.get('/', protect, authorize(UserRole.ADMIN, UserRole.SOCIAL_HEALTH_WORKER, UserRole.SCREENING_VOLUNTEER), (req, res, next) =>
  container.communitHealthUnitController.getAllCommunityHealthUnits(req, res, next),
);

router.use('/:id/referrals', protect, authorize(UserRole.SOCIAL_HEALTH_WORKER), referralRoute);
router.get('/:id', protect, authorize(UserRole.ADMIN, UserRole.SOCIAL_HEALTH_WORKER, UserRole.SCREENING_VOLUNTEER), (req, res, next) =>
  container.communitHealthUnitController.getCommunityHealthUnitById(req, res, next),
);

router.post(
  '/',
  protect,
  authorize(UserRole.ADMIN),
  validateBody(CreateCommunityHealthUnitSchema),
  (req, res, next) => container.communitHealthUnitController.createCommunityHealthUnit(req, res, next),
);

export default router;