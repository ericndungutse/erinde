import { Router } from 'express';
import { container } from '../container.js';
import { validateCreateAssessment } from '../validation/assessmentValidator.js';
import { protect } from '../security/auth.middleware.js';

const router = Router();

router.post('/', protect, validateCreateAssessment, (req, res, next) =>
  container.assessmentController.createAssessment(req, res, next),
);

// GET /assessments/:id - Get single assessment details (no population)
router.get('/:id', protect, (req, res) => container.assessmentController.getAssessmentById(req, res));
export default router;
