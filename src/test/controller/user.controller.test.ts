import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import UserController from '../../controller/user.controller.js';

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

describe('UserController.findUserByPatientNumberController', () => {
  it('returns 400 when patient number is missing', async () => {
    const mockService: any = { findUserByPatientNumber: vi.fn() };
    const controller = new UserController(mockService);

    const req = { params: {} } as unknown as Request;
    const res = createMockRes();

    await controller.findUserByPatientNumberController(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: 'Patient number is required',
      }),
    );
  });

  it('returns 404 when user not found', async () => {
    const mockService: any = { findUserByPatientNumber: vi.fn().mockResolvedValue(null) };
    const controller = new UserController(mockService);

    const req = { params: { patientNumber: '12345' } } as unknown as Request;
    const res = createMockRes();

    await controller.findUserByPatientNumberController(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: 'User not found',
      }),
    );
  });

  it('returns 500 when service throws an error', async () => {
    const mockService: any = { findUserByPatientNumber: vi.fn().mockRejectedValue(new Error('Boom')) };
    const controller = new UserController(mockService);

    const req = { params: { patientNumber: '12345' } } as unknown as Request;
    const res = createMockRes();

    await controller.findUserByPatientNumberController(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'error',
        message: 'Boom',
      }),
    );
  });
});
