import { Router } from 'express';
import { container } from '../container.js';
import { validateCreateAssessment } from '../validation/assessmentValidator.js';
import { protect, authorize } from '../security/auth.middleware.js';
import { UserRole } from '../types/roles.types.js';
import { resolveAssessmentTakenFrom } from '../middleware/resolveAssessmentTakenFrom.js';
import { validateBody } from '../validation/validator.js';
import { CreateAssessmentSchemaZ } from '../dto/assessmentDto.js';
const router = Router();

router.post('/', protect, resolveAssessmentTakenFrom, validateBody(CreateAssessmentSchemaZ), (req, res, next) =>
  container.assessmentController.createAssessment(req, res, next),
);

// GET /assessments/me/last-24-hours - List assessments taken in the last 24 hours
// by the logged-in social health worker with patient number, names, indicator, and classification label
router.get('/me/last-24-hours', protect, authorize(UserRole.SOCIAL_HEALTH_WORKER), (req, res) =>
  container.assessmentController.listMyAssessmentsLast24Hours(req, res),
);

// GET /assessments/:id - Get single assessment details (no population)
router.get('/:id', protect, (req, res) => container.assessmentController.getAssessmentById(req, res));
export default router;
