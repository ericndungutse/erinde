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