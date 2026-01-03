import { Router } from 'express';
import { container } from '../container.js';

const rouer = Router();

rouer.post('/authenticate', (req, res) => container.authController.authenticate(req, res));
export default rouer;
