import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

import { ModelNames } from '../../constants/constant.values.js';
import { CreateAssessmentSchemaZ } from '../../dto/assessmentDto.js';
import { validateBody } from '../../validation/validator.js';

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

const validPayload = {
  patientNumber: 12345,
  indicator: 'indicator-123',
  takenFrom: 'chu-123',
  takenFromType: ModelNames.CommunityHealthUnit,
  readings: {
    random_blood_glucose: {
      value: 139,
      unit: 'mg/dL',
    },
  },
};

describe('validateCreateAssessment', () => {
  const middleware = validateBody(CreateAssessmentSchemaZ);

  it('calls next for a valid request body', () => {
    const req = { body: validPayload } as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns 400 when patientNumber is missing', () => {
    const req = {
      body: {
        indicator: validPayload.indicator,
        takenFrom: validPayload.takenFrom,
        takenFromType: validPayload.takenFromType,
        readings: validPayload.readings,
      },
    } as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toHaveProperty('patientNumber');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when patientNumber is not positive', () => {
    const req = {
      body: {
        ...validPayload,
        patientNumber: 0,
      },
    } as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toMatchObject({
      patientNumber: 'patientNumber must be a positive integer',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when indicator is empty', () => {
    const req = {
      body: {
        ...validPayload,
        indicator: '',
      },
    } as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toMatchObject({
      indicator: 'indicator id cannot be empty',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when readings are missing', () => {
    const req = {
      body: {
        patientNumber: validPayload.patientNumber,
        indicator: validPayload.indicator,
        takenFrom: validPayload.takenFrom,
        takenFromType: validPayload.takenFromType,
      },
    } as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toHaveProperty('readings');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when a reading unit is empty', () => {
    const req = {
      body: {
        ...validPayload,
        readings: {
          random_blood_glucose: {
            value: 139,
            unit: '',
          },
        },
      },
    } as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toMatchObject({
      'readings.random_blood_glucose.unit': 'reading.unit cannot be empty',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when a reading value is decimal', () => {
    const req = {
      body: {
        ...validPayload,
        readings: {
          random_blood_glucose: {
            value: 139.9,
            unit: 'mg/dL',
          },
        },
      },
    } as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toHaveProperty('readings.random_blood_glucose.value');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 with multiple field errors', () => {
    const req = {
      body: {
        patientNumber: -5,
        indicator: '',
        takenFrom: validPayload.takenFrom,
        takenFromType: validPayload.takenFromType,
        readings: {
          random_blood_glucose: {
            value: 139,
            unit: '',
          },
        },
      },
    } as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toMatchObject({
      patientNumber: 'patientNumber must be a positive integer',
      indicator: 'indicator id cannot be empty',
      'readings.random_blood_glucose.unit': 'reading.unit cannot be empty',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
