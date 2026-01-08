import { Router } from 'express';
import { validateRegisterUser } from '../validation/validateRegisterUser.js';
import { container } from '../container.js';
import { authorize, protect } from '../security/auth.middleware.js';
import { AccountRole } from '../types/user.types.js';

const router = Router();

router.post(
  '/',
  protect,
  authorize(AccountRole.SOCIAL_HEALTH_WORKER, AccountRole.SCREENING_VOLUNTEER),
  validateRegisterUser,
  (req, res) => container.userController.registerUserController(req, res)
);

router.get('/:patientNumber', (req, res) => container.userController.findUserByPatientNumberController(req, res));

export default router;
