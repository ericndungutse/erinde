import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

import IndicatorController from '../../controller/indicator.controller.js';

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

describe('IndicatorController.getAllIndicators', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with indicators from the service', async () => {
    const indicators = [
      {
        id: 'indicator-1',
        name: 'diabetes',
      },
    ];

    const mockService: any = {
      getAllIndicators: vi.fn().mockResolvedValue(indicators),
    };
    const controller = new IndicatorController(mockService);

    const req = {} as Request;
    const res = createMockRes();

    await controller.getAllIndicators(req, res);

    expect(mockService.getAllIndicators).toHaveBeenCalledWith();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      data: {
        indicators,
      },
    });
  });

  it('returns 500 when service throws', async () => {
    const error = new Error('indicator-list-failed');

    const mockService: any = {
      getAllIndicators: vi.fn().mockRejectedValue(error),
    };
    const controller = new IndicatorController(mockService);

    const req = {} as Request;
    const res = createMockRes();

    await controller.getAllIndicators(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      message: 'Failed to fetch indicators',
      error,
    });
  });
});

describe('IndicatorController.getIndicatorDetails', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 404 when indicator is not found', async () => {
    const mockService: any = {
      getIndicatorDetails: vi.fn().mockResolvedValue(null),
    };
    const controller = new IndicatorController(mockService);

    const req = { params: { id: 'missing-indicator' } } as unknown as Request;
    const res = createMockRes();

    await controller.getIndicatorDetails(req as any, res);

    expect(mockService.getIndicatorDetails).toHaveBeenCalledWith('missing-indicator');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'Indicator not found' });
  });

  it('returns 200 with indicator details when found', async () => {
    const indicator = {
      id: 'indicator-2',
      name: 'hypertension',
      readings: [
        { type: 'systolic_blood_pressure', unit: 'mmHg' },
        { type: 'diastolic_blood_pressure', unit: 'mmHg' },
      ],
    };

    const mockService: any = {
      getIndicatorDetails: vi.fn().mockResolvedValue(indicator),
    };
    const controller = new IndicatorController(mockService);

    const req = { params: { id: 'indicator-2' } } as unknown as Request;
    const res = createMockRes();

    await controller.getIndicatorDetails(req as any, res);

    expect(mockService.getIndicatorDetails).toHaveBeenCalledWith('indicator-2');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      data: {
        indicator,
      },
    });
  });

  it('returns 500 when service throws', async () => {
    const error = new Error('indicator-details-failed');

    const mockService: any = {
      getIndicatorDetails: vi.fn().mockRejectedValue(error),
    };
    const controller = new IndicatorController(mockService);

    const req = { params: { id: 'indicator-3' } } as unknown as Request;
    const res = createMockRes();

    await controller.getIndicatorDetails(req as any, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      message: 'Failed to fetch indicator details',
      error,
    });
  });
});
