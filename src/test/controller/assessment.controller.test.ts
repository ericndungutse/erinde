import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

import AssessmentController from '../../controller/assessment.controller.js';

function createMockRes(): Response & { statusCode?: number; body?: any } {
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((payload: any) => {
    res.body = payload;
    return res;
  });
  return res as Response & { statusCode?: number; body?: any };
}

describe('AssessmentController.createAssessment', () => {
  it('passes request body and authenticated user id to the service', async () => {
    const createdAssessment = {
      id: 'assessment-123',
      readings: {
        random_blood_glucose: { value: 120, unit: 'mg/dL' },
      },
      classification: {
        label: 'Normal',
        status_code: 'healthy',
      },
      recommendations: ['Komeza kurya indyo yuzuye'],
    };

    const mockService: any = {
      createAssessment: vi.fn().mockResolvedValue(createdAssessment),
    };
    const controller = new AssessmentController(mockService);

    const req = {
      body: {
        patientNumber: 1001,
        indicator: 'indicator-123',
        readings: {
          random_blood_glucose: { value: 120, unit: 'mg/dL' },
        },
      },
      user: {
        id: 'user-123',
      },
    } as unknown as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.createAssessment(req, res, next);

    expect(mockService.createAssessment).toHaveBeenCalledWith(req.body, 'user-123');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      status: 'success',
      message: 'Assessment created successfully',
      data: {
        assessment: createdAssessment,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes undefined evaluator id when req.user is absent', async () => {
    const createdAssessment = {
      id: 'assessment-124',
      readings: {
        height: { value: 170, unit: 'cm' },
        weight: { value: 64, unit: 'kg' },
      },
      classification: {
        label: 'Normal',
        status_code: 'healthy',
      },
      recommendations: ["Komeza akamenyero keza ufite k'ubuzima"],
    };

    const mockService: any = {
      createAssessment: vi.fn().mockResolvedValue(createdAssessment),
    };
    const controller = new AssessmentController(mockService);

    const req = {
      body: {
        patientNumber: 1002,
        indicator: 'indicator-456',
        readings: {
          height: { value: 170, unit: 'cm' },
          weight: { value: 64, unit: 'kg' },
        },
      },
    } as unknown as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.createAssessment(req, res, next);

    expect(mockService.createAssessment).toHaveBeenCalledWith(req.body, undefined);
    expect(res.statusCode).toBe(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const error = new Error('Assessment service failed');
    const mockService: any = {
      createAssessment: vi.fn().mockRejectedValue(error),
    };
    const controller = new AssessmentController(mockService);

    const req = {
      body: {
        patientNumber: 1003,
        indicator: 'indicator-789',
        readings: {
          systolic_blood_pressure: { value: 120, unit: 'mmHg' },
          diastolic_blood_pressure: { value: 80, unit: 'mmHg' },
        },
      },
      user: {
        id: 'user-789',
      },
    } as unknown as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.createAssessment(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('AssessmentController.getAssessmentById', () => {
  it('returns 400 when assessment id is missing', async () => {
    const mockService: any = {
      getAssessmentById: vi.fn(),
    };
    const controller = new AssessmentController(mockService);

    const req = { params: {} } as unknown as Request;
    const res = createMockRes();

    await controller.getAssessmentById(req, res);

    expect(mockService.getAssessmentById).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      status: 'fail',
      message: 'Assessment id is required',
    });
  });

  it('returns 404 when assessment is not found', async () => {
    const mockService: any = {
      getAssessmentById: vi.fn().mockResolvedValue(null),
    };
    const controller = new AssessmentController(mockService);

    const req = { params: { id: 'assessment-404' } } as unknown as Request;
    const res = createMockRes();

    await controller.getAssessmentById(req, res);

    expect(mockService.getAssessmentById).toHaveBeenCalledWith('assessment-404');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      status: 'fail',
      message: 'Assessment not found',
    });
  });

  it('returns 200 with assessment details when found', async () => {
    const assessment = {
      id: 'assessment-200',
      classification: {
        label: 'Normal',
        status_code: 'healthy',
      },
    };
    const mockService: any = {
      getAssessmentById: vi.fn().mockResolvedValue(assessment),
    };
    const controller = new AssessmentController(mockService);

    const req = { params: { id: 'assessment-200' } } as unknown as Request;
    const res = createMockRes();

    await controller.getAssessmentById(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      data: { assessment },
    });
  });

  it('returns 500 when service throws', async () => {
    const mockService: any = {
      getAssessmentById: vi.fn().mockRejectedValue(new Error('Failed to query assessment')),
    };
    const controller = new AssessmentController(mockService);

    const req = { params: { id: 'assessment-500' } } as unknown as Request;
    const res = createMockRes();

    await controller.getAssessmentById(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Failed to query assessment',
    });
  });
});

describe('AssessmentController.listMyAssessmentsLast24Hours', () => {
  it('returns 401 when authenticated user context is missing', async () => {
    const mockService: any = {
      listAssessmentsByEvaluatorLast24Hours: vi.fn(),
    };
    const controller = new AssessmentController(mockService);

    const req = {} as unknown as Request;
    const res = createMockRes();

    await controller.listMyAssessmentsLast24Hours(req, res);

    expect(mockService.listAssessmentsByEvaluatorLast24Hours).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      status: 'fail',
      message: 'Unauthorized: missing user context',
    });
  });

  it('returns 200 with last 24-hour assessments for the authenticated evaluator', async () => {
    const assessments = [
      {
        _id: 'assessment-1',
        patientNumber: 1001,
        patientName: 'John Doe',
        indicatorName: 'diabetes',
        classificationLabel: 'Normal',
      },
    ];

    const mockService: any = {
      listAssessmentsByEvaluatorLast24Hours: vi.fn().mockResolvedValue(assessments),
    };
    const controller = new AssessmentController(mockService);

    const req = { user: { id: 'evaluator-1' } } as unknown as Request;
    const res = createMockRes();

    await controller.listMyAssessmentsLast24Hours(req, res);

    expect(mockService.listAssessmentsByEvaluatorLast24Hours).toHaveBeenCalledWith('evaluator-1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      data: { assessments },
    });
  });

  it('returns 500 when listing assessments fails', async () => {
    const mockService: any = {
      listAssessmentsByEvaluatorLast24Hours: vi.fn().mockRejectedValue(new Error('Aggregation failed')),
    };
    const controller = new AssessmentController(mockService);

    const req = { user: { id: 'evaluator-2' } } as unknown as Request;
    const res = createMockRes();

    await controller.listMyAssessmentsLast24Hours(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Aggregation failed',
    });
  });
});