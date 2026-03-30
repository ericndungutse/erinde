import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi, type Mock } from 'vitest';

import { ConstantValues, ModelNames } from '../../constants/constant.values.js';
import AssessmentController from '../../controller/assessment.controller.js';
import type { AssessmentCreatedResponseDTO, RecentAssessmentSummaryDTO } from '../../dto/assessmentDto.js';
import ParameterIsRequiredError from '../../Errors/ParameterIsRequiredError.js';
import type { IAssessmentService } from '../../service/interface/iassessment.service.js';
import i18next from 'i18next';

const mockAssessmentService: IAssessmentService = {
  createAssessment: vi.fn(),
  getAssessmentById: vi.fn(),
  getAssessmentIndicator: vi.fn(),
  listAssessmentsByEvaluatorLast24Hours: vi.fn(),
};

const next = vi.fn() as unknown as NextFunction;

function createMockRes(): Response & { statusCode?: number; body?: any } {
  const res: any = {};
  // Default
  res.statusCode = 200;

  // ---------- MOCKING Response Status
  // Mock of status (res.status()) from controller
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });

  // ---------- MOCKING RESPONSE BODY
  // Mocks res.json. It mocks what will be returned by json()
  res.json = vi.fn((payload: any) => {
    res.body = payload;
    return res;
  });
  return res as Response & { statusCode?: number; body?: any };
}

describe('AssessmentController.createAssessment', () => {
  it('passes request body and authenticated user id to the service', async () => {
    const createdAssessment: AssessmentCreatedResponseDTO = {
      id: '507f1f77bcf86cd799439011',
      patientNumber: 1001,
      readings: {},
      takenFromType: ModelNames.CommunityHealthUnit,
      takenFrom: '507f1f77bcf86cd799439012',
      classification: {
        label: 'Pre-Diabetes',
        status_code: 'danger',
      },
      recommendations: ['Recommendation 1', 'Recommendation 2'],
      evaluatedDate: new Date('2024-01-15'),
    };

    // Mock Response from createAssessment
    (mockAssessmentService.createAssessment as Mock).mockResolvedValue(createdAssessment);

    const controller = new AssessmentController(mockAssessmentService);

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
      existingPendingReferral: {},
    } as unknown as Request;

    const res = createMockRes();

    await controller.createAssessment(req, res, next);

    expect(mockAssessmentService.createAssessment).toHaveBeenCalledWith(
      req.body,
      req?.user?.id,
      req.existingPendingReferral,
    );
    expect(res.statusCode).toBe(201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body).toEqual({
      status: 'success',
      message: 'Assessment created successfully',
      data: {
        assessment: createdAssessment,
      },
    });
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
    const controller = new AssessmentController(mockAssessmentService);

    const req = { params: {} } as unknown as Request;
    const res = createMockRes();

    await controller.getAssessmentById(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ParameterIsRequiredError));
    expect(mockAssessmentService.getAssessmentById).not.toHaveBeenCalled();
  });

  it('returns 404 when assessment is not found', async () => {
    const mockService: any = {
      getAssessmentById: vi.fn().mockResolvedValue(null),
    };
    const controller = new AssessmentController(mockService);

    const req = { params: { id: 'assessment-404' } } as unknown as Request;
    const res = createMockRes();

    await controller.getAssessmentById(req, res, next);

    expect(mockService.getAssessmentById).toHaveBeenCalledWith('assessment-404');
    expect(res.statusCode).toBe(404);

    expect(res.body).toEqual({
      status: 'fail',
      message: i18next.t('assessment_not_found', {
        lng: res.req?.language || ConstantValues.DEFAULT_LANGUAGE,
      }),
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

    (mockAssessmentService.getAssessmentById as Mock).mockResolvedValue(assessment);

    const controller = new AssessmentController(mockAssessmentService);

    const req = { params: { id: 'assessment-200' } } as unknown as Request;
    const res = createMockRes();

    await controller.getAssessmentById(req, res, next);

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

    await controller.getAssessmentById(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Failed to query assessment',
    });
  });
});

describe('AssessmentController.listMyAssessmentsLast24Hours', () => {
  it('returns 200 with last 24-hour assessments for the authenticated evaluator', async () => {
    const assessments: RecentAssessmentSummaryDTO[] = [
      {
        _id: 'assessment-1',
        patientNumber: 1001,
        patient: {
          _id: 'patient-1',
          firstname: 'John',
          lastname: 'Doe',
        },
        indicator: {
          _id: 'indicator-1',
          name: 'diabetes',
        },
        classification: {
          label: 'Normal',
          status_code: 'NORMAL',
        },
      },
    ];

    const controller = new AssessmentController(mockAssessmentService);

    const req = { user: { id: 'evaluator-1' } } as unknown as Request;

    (mockAssessmentService.listAssessmentsByEvaluatorLast24Hours as Mock).mockResolvedValue(assessments);
    const res = createMockRes();

    await controller.listMyAssessmentsLast24Hours(req, res, next);

    expect(mockAssessmentService.listAssessmentsByEvaluatorLast24Hours).toHaveBeenCalledWith('evaluator-1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      message: 'Assessments fetched successfully',
      data: { assessments },
    });
  });
});
