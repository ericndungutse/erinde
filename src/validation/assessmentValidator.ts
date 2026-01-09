import type { NextFunction, Request, Response } from 'express';
import { CreateAssessmentSchemaZ } from '../types/assessment.types.js';

export function validateCreateAssessment(req: Request, res: Response, next: NextFunction) {
  // Validate request body
  const result = CreateAssessmentSchemaZ.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid request data',
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  next();
}
