import type { NextFunction, Request, Response } from 'express';
import type { IAssessmentService } from '../service/interface/iassessment.service.js';
import ResponseFactory from './responseFactory.js';
import UnauthenticatedError from '../Errors/unauthenticatedError.js';
import ParameterIsRequiredError from '../Errors/ParameterIsRequiredError.js';

export default class AssessmentController {
  private _assessmentService: IAssessmentService;

  constructor(assessmentService: IAssessmentService) {
    this._assessmentService = assessmentService;
  }

  async createAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const created = await this._assessmentService.createAssessment(
        req.body,
        req.user?.id,
        req.existingPendingReferral,
      );
      ResponseFactory.getResponseFactory(res).created('assessment', created, 'Assessment created successfully');
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Get single assessment details by id (no population)
   */
  async getAssessmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        return next(new ParameterIsRequiredError('assessmentId'));
      }

      const assessment = await this._assessmentService.getAssessmentById(id);
      if (!assessment) {
        return ResponseFactory.getResponseFactory(res).notFound('assessment_not_found');
      }

      return res.status(200).json({ status: 'success', data: { assessment } });
    } catch (err: any) {
      const msg = err?.message || 'Failed to fetch assessment';
      return res.status(500).json({ status: 'error', message: msg });
    }
  }

  /**
   * List assessments taken in the last 24 hours by the logged-in
   * social health worker, returning patient number, names, indicator,
   * and classification label.
   */
  async listMyAssessmentsLast24Hours(req: Request, res: Response, next: NextFunction) {
    try {
      const assessments = await this._assessmentService.listAssessmentsByEvaluatorLast24Hours(req.user!.id);

      ResponseFactory.getResponseFactory(res).ok({
        key: 'assessments',
        data: assessments,
        message: 'Assessments fetched successfully',
      });
    } catch (err: any) {
      next(new Error(err?.message || 'Failed to fetch recent assessments'));
    }
  }
}
