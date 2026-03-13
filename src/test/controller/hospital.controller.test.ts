import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

import HospitalController from '../../controller/hospital.controller.js';

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

describe('HospitalController.getAllHospitals', () => {
  it('returns 200 with hospitals from the service', async () => {
    const hospitals = [
      {
        id: 'hospital-1',
        name: 'Nyiranuma Health Center',
        type: 'HEALTH_CENTER',
      },
    ];

    const mockService: any = {
      getAllHospitals: vi.fn().mockResolvedValue(hospitals),
    };
    const controller = new HospitalController(mockService);

    const req = {} as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.getAllHospitals(req, res, next);

    expect(mockService.getAllHospitals).toHaveBeenCalledWith();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      message: 'Hospitals retrieved successfully',
      data: {
        hospitals,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const error = new Error('Hospital service failed');

    const mockService: any = {
      getAllHospitals: vi.fn().mockRejectedValue(error),
    };
    const controller = new HospitalController(mockService);

    const req = {} as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.getAllHospitals(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
