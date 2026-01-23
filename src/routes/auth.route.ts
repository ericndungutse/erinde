import { Router } from 'express';
import { container } from '../container.js';
import { validateBody } from '../validation/validator.js';
import { LoginSchema } from '../types/auth.types.js';

const router = Router();

router.post('/login', validateBody(LoginSchema), (req, res, next) =>
  container.authController.authenticate(req, res, next),
);
export default router;
