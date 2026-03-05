import { Router } from 'express';
import { validateRegisterUser, validateRegisterUserWithAccount } from '../validation/validateRegisterUser.js';
import { container } from '../container.js';
import { authorize, protect } from '../security/auth.middleware.js';
import { AccountRole } from '../types/user.types.js';
import { validateBody } from '../validation/validator.js';
import { RegisterUserSchema, RegisterUserWithAccountSchema } from '../types/register-user.types.js';

const router = Router();

// GET /api/v1/users - List all users (id, name, role) - Admin only
router.get('/', protect, authorize(AccountRole.ADMIN), (req, res) =>
  container.userController.getAllUsersController(req, res),
);

router.post(
  '/',
  protect,
  authorize(AccountRole.SOCIAL_HEALTH_WORKER, AccountRole.SCREENING_VOLUNTEER),
  validateBody(RegisterUserSchema),
  (req, res, next) => container.userController.registerUserController(req, res, next),
);
router.post(
  '/admin/register',
  protect,
  authorize(AccountRole.ADMIN),
  validateBody(RegisterUserWithAccountSchema),
  (req, res, next) => container.userController.registerUserWithAccountController(req, res, next),
);
router.get('/:userId', protect, authorize(AccountRole.ADMIN), (req, res, next) =>
  container.userController.findUserDetailsByUserIdForAdminController(req, res, next),
);
router.get('/:patientNumber', (req, res) => container.userController.findUserByPatientNumberController(req, res));

export default router;
