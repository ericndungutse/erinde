import { Router } from 'express';
import { container } from '../container.js';
import { CreateAssessmentSchemaZ } from '../dto/assessmentDto.js';
import { resolveAssessmentTakenFrom, validateAssessmentTakenTwice } from '../middleware/assessment.middlewares.js';
import { authorize, protect } from '../security/auth.middleware.js';
import { UserRole } from '../types/roles.types.js';
import { validateBody } from '../validation/validator.js';
import { checkPendingReferral } from '../middleware/referral.middleware.js';
const router = Router();

router.post(
  '/',
  protect,
  resolveAssessmentTakenFrom,
  validateBody(CreateAssessmentSchemaZ),
  validateAssessmentTakenTwice,
  checkPendingReferral,
  (req, res, next) => container.assessmentController.createAssessment(req, res, next),
);

// GET /assessments/me/last-24-hours - List assessments taken in the last 24 hours
// by the logged-in social health worker with patient number, names, indicator, and classification label
router.get('/me/last-24-hours', protect, authorize(UserRole.SOCIAL_HEALTH_WORKER), (req, res, next) =>
  container.assessmentController.listMyAssessmentsLast24Hours(req, res, next),
);

// GET /assessments/:id - Get single assessment details (no population)
router.get('/:id', protect, (req, res, next) => container.assessmentController.getAssessmentById(req, res, next));
export default router;
