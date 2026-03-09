import { Router } from 'express';
import { container } from '../container.js';
import { AdminUpdateUserPasswordSchema, RegisterUserSchema, RegisterUserWithAccountSchema } from '../dto/user.dto.js';
import { authorize, protect } from '../security/auth.middleware.js';
import { UserRole } from '../types/roles.types.js';
import { validateBody } from '../validation/validator.js';

const router = Router();

// GET /api/v1/users - List all users (id, name, role) - Admin only
router.get('/', protect, authorize(UserRole.ADMIN), (req, res) =>
  container.userController.getAllUsersController(req, res),
);

router.post(
  '/',
  protect,
  authorize(UserRole.SOCIAL_HEALTH_WORKER, UserRole.SCREENING_VOLUNTEER),
  validateBody(RegisterUserSchema),
  (req, res, next) => container.userController.registerUserController(req, res, next),
);
router.post(
  '/admin/register',
  protect,
  authorize(UserRole.ADMIN),
  validateBody(RegisterUserWithAccountSchema),
  (req, res, next) => container.userController.registerUserWithAccountController(req, res, next),
);
router.get('/admin/:userId', protect, authorize(UserRole.ADMIN), (req, res, next) =>
  container.userController.findUserDetailsByUserIdForAdminController(req, res, next),
);
router.patch(
  '/admin/:userId/update-password',
  protect,
  authorize(UserRole.ADMIN),
  validateBody(AdminUpdateUserPasswordSchema),
  (req, res, next) => container.userController.updateUserPasswordByAdminController(req, res, next),
);
router.get('/:patientNumber', (req, res) => container.userController.findUserByPatientNumberController(req, res));

export default router;
