import type { Request, Response } from 'express';
import { CreateAssessmentSchemaZ } from '../types/assessment.types.js';
import type { IAssessmentService } from '../service/interface/iassessment.service.js';

export default class AssessmentController {
  private _assessmentService: IAssessmentService;

  constructor(assessmentService: IAssessmentService) {
    this._assessmentService = assessmentService;
  }

  async createAssessment(req: Request, res: Response) {
    try {
      // Resolve creator id from authenticated user if available
      const evaluatedBy = req.user?.id;

      const created = await this._assessmentService.createAssessment(req.body, evaluatedBy);

      return res
        .status(201)
        .json({ status: 'success', message: 'Assessment created successfully', data: { assessment: created } });
    } catch (err: any) {
      const msg = err?.message || 'Failed to create assessment';

      // Map not-found style errors to 404
      if (msg.toLowerCase().includes('not found')) {
        return res.status(404).json({ status: 'fail', message: msg });
      }

      // Zod validation errors or other client issues
      return res.status(400).json({ status: 'fail', message: msg });
    }
  }
}
