import { Router } from 'express';
import { container } from '../container.js';
import { validateCreateAssessment } from '../validation/assessmentValidator.js';
import { protect } from '../security/auth.middleware.js';

const router = Router();

router.post('/', protect, validateCreateAssessment, (req, res) =>
  container.assessmentController.createAssessment(req, res)
);
export default router;
