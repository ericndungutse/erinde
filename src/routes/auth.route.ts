import { Router } from 'express';
import { container } from '../container.js';

const router = Router();

router.post('/authenticate', (req, res) => container.authController.authenticate(req, res));
export default router;
