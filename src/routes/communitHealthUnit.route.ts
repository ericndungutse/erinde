import { Router } from 'express';
import { container } from '../container.js';
import { CreateCommunityHealthUnitSchema } from '../dto/communitHealthUnitDto.js';
import { authorize, protect } from '../security/auth.middleware.js';
import { UserRole } from '../types/roles.types.js';
import { validateBody } from '../validation/validator.js';

const router = Router();

router.post(
  '/',
  protect,
  authorize(UserRole.ADMIN),
  validateBody(CreateCommunityHealthUnitSchema),
  (req, res, next) => container.communitHealthUnitController.createCommunityHealthUnit(req, res, next),
);

export default router;