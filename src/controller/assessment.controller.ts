import type { NextFunction, Request, Response } from 'express';
import type { IAssessmentService } from '../service/interface/iassessment.service.js';
import ResponseFactory from './responseFactory.js';

export default class AssessmentController {
  private _assessmentService: IAssessmentService;

  constructor(assessmentService: IAssessmentService) {
    this._assessmentService = assessmentService;
  }

  async createAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      // Resolve creator id from authenticated user if available
      const evaluatedBy = req.user?.id;

      const created = await this._assessmentService.createAssessment(req.body, evaluatedBy);
      ResponseFactory.getResponseFactory(res).created('assessment', created, 'Assessment created successfully');
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Get single assessment details by id (no population)
   */
  async getAssessmentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ status: 'fail', message: 'Assessment id is required' });
      }

      const assessment = await this._assessmentService.getAssessmentById(id);
      if (!assessment) {
        return res.status(404).json({ status: 'fail', message: 'Assessment not found' });
      }

      return res.status(200).json({ status: 'success', data: { assessment } });
    } catch (err: any) {
      const msg = err?.message || 'Failed to fetch assessment';
      return res.status(500).json({ status: 'error', message: msg });
    }
  }
}
