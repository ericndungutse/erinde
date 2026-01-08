import { Router } from 'express';
import { validateRegisterUser } from '../validation/validateRegisterUser.js';
import { container } from '../container.js';

const router = Router();

router.post('/', validateRegisterUser, (req, res) => container.userController.registerUserController(req, res));

export default router;
