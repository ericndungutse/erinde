import { Router } from 'express';
import { container } from '../container.js';

const router = Router();

router.post('/login', (req, res, next) => container.authController.authenticate(req, res, next));
export default router;
