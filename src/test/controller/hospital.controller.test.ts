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
        _id: 'hospital-1',
        name: 'Nyiranuma Health Center',
        type: 'HEALTH_CENTER',
      },
    ];
    const pagination = {
      currentPage: 1,
      perPage: 100,
      totalResults: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      nextPage: null,
      prevPage: null,
    };

    const mockService: any = {
      getAllHospitals: vi.fn().mockResolvedValue({ hospitals, pagination }),
    };
    const controller = new HospitalController(mockService);

    const req = { query: {} } as unknown as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.getAllHospitals(req, res, next);

    expect(mockService.getAllHospitals).toHaveBeenCalledWith({});
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      message: 'Hospitals retrieved successfully',
      data: {
        hospitals,
        pagination,
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

    const req = { query: {} } as unknown as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.getAllHospitals(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('HospitalController.createHospital', () => {
  it('returns 201 with created hospital from the service', async () => {
    const createdHospital = {
      _id: 'hospital-1',
      name: 'Nyiranuma Health Center',
      type: 'HEALTH_CENTER',
      address: {
        province: 'kigali',
        district: 'gasabo',
        sector: 'kimironko',
        cell: 'kibagabaga',
        village: 'nyarutarama',
      },
    };

    const mockService: any = {
      createHospital: vi.fn().mockResolvedValue(createdHospital),
    };
    const controller = new HospitalController(mockService);

    const req = { body: { name: 'Nyiranuma Health Center' } } as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.createHospital(req, res, next);

    expect(mockService.createHospital).toHaveBeenCalledWith(req.body);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      status: 'success',
      message: 'Hospital created successfully',
      data: {
        hospital: createdHospital,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const error = new Error('Hospital create failed');

    const mockService: any = {
      createHospital: vi.fn().mockRejectedValue(error),
    };
    const controller = new HospitalController(mockService);

    const req = { body: { name: 'Nyiranuma Health Center' } } as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.createHospital(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
