import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

import ReferralController from '../../controller/referral.controller.js';

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

describe('ReferralController.listMyReferrals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when user context is missing', async () => {
    const mockService: any = {
      listReferralsByHealthWorker: vi.fn(),
    };
    const controller = new ReferralController(mockService);
    const req = {} as Request;
    const res = createMockRes();

    await controller.listMyReferrals(req, res);

    expect(mockService.listReferralsByHealthWorker).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ status: 'fail', message: 'Unauthorized: missing user context' });
  });

  it('returns 200 with default pending referrals for logged-in user', async () => {
    const referrals = [{ id: 'ref-1' }];
    const pagination = {
      currentPage: 2,
      perPage: 5,
      totalResults: 7,
      totalPages: 2,
      hasNextPage: false,
      hasPrevPage: true,
      nextPage: null,
      prevPage: 1,
    };
    const mockService: any = {
      listReferralsByHealthWorker: vi.fn().mockResolvedValue({ referrals, pagination }),
    };
    const controller = new ReferralController(mockService);
    const req = { user: { id: 'hw-1' }, query: { page: '2', limit: '5' } } as unknown as Request;
    const res = createMockRes();

    await controller.listMyReferrals(req, res);

    expect(mockService.listReferralsByHealthWorker).toHaveBeenCalledWith('hw-1', 'PENDING', {
      page: '2',
      limit: '5',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'success', data: { referrals, pagination } });
  });

  it('uses status from query when provided', async () => {
    const referrals = [{ id: 'ref-2' }];
    const pagination = {
      currentPage: 1,
      perPage: 10,
      totalResults: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      nextPage: null,
      prevPage: null,
    };
    const mockService: any = {
      listReferralsByHealthWorker: vi.fn().mockResolvedValue({ referrals, pagination }),
    };
    const controller = new ReferralController(mockService);
    const req = {
      user: { id: 'hw-1' },
      query: { status: 'completed', page: '1', limit: '10' },
    } as unknown as Request;
    const res = createMockRes();

    await controller.listMyReferrals(req, res);

    expect(mockService.listReferralsByHealthWorker).toHaveBeenCalledWith('hw-1', 'COMPLETED', {
      status: 'completed',
      page: '1',
      limit: '10',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'success', data: { referrals, pagination } });
  });

  it('returns 400 when status query is invalid', async () => {
    const mockService: any = {
      listReferralsByHealthWorker: vi.fn(),
    };
    const controller = new ReferralController(mockService);
    const req = {
      user: { id: 'hw-1' },
      query: { status: 'something-else' },
    } as unknown as Request;
    const res = createMockRes();

    await controller.listMyReferrals(req, res);

    expect(mockService.listReferralsByHealthWorker).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      status: 'fail',
      message: 'Invalid status. Allowed values: PENDING, COMPLETED, CANCELLED',
    });
  });

  it('returns 500 when service throws', async () => {
    const mockService: any = {
      listReferralsByHealthWorker: vi.fn().mockRejectedValue(new Error('list-referrals-failed')),
    };
    const controller = new ReferralController(mockService);
    const req = { user: { id: 'hw-1' } } as unknown as Request;
    const res = createMockRes();

    await controller.listMyReferrals(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: 'list-referrals-failed' });
  });
});

describe('ReferralController.listMyHospitalReferrals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when nurse hospital context is missing', async () => {
    const mockService: any = {
      listReferralsByHospital: vi.fn(),
    };
    const controller = new ReferralController(mockService);
    const req = { user: { id: 'nurse-1', roles: ['NURSE'] } } as unknown as Request;
    const res = createMockRes();

    await controller.listMyHospitalReferrals(req, res);

    expect(mockService.listReferralsByHospital).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ status: 'fail', message: 'Unauthorized: missing nurse hospital context' });
  });

  it('returns 200 with referrals for logged-in nurse hospital', async () => {
    const referrals = [{ id: 'ref-hosp-1' }];
    const pagination = {
      currentPage: 2,
      perPage: 5,
      totalResults: 7,
      totalPages: 2,
      hasNextPage: false,
      hasPrevPage: true,
      nextPage: null,
      prevPage: 1,
    };
    const mockService: any = {
      listReferralsByHospital: vi.fn().mockResolvedValue({ referrals, pagination }),
    };
    const controller = new ReferralController(mockService);
    const req = {
      user: { id: 'nurse-1', roles: ['NURSE'], hospitalId: 'hospital-1' },
      query: { page: '2', limit: '5' },
    } as unknown as Request;
    const res = createMockRes();

    await controller.listMyHospitalReferrals(req, res);

    expect(mockService.listReferralsByHospital).toHaveBeenCalledWith('hospital-1', {
      page: '2',
      limit: '5',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'success', data: { referrals, pagination } });
  });

  it('returns 500 when service throws', async () => {
    const mockService: any = {
      listReferralsByHospital: vi.fn().mockRejectedValue(new Error('list-hospital-referrals-failed')),
    };
    const controller = new ReferralController(mockService);
    const req = { user: { id: 'nurse-1', roles: ['NURSE'], hospitalId: 'hospital-1' } } as unknown as Request;
    const res = createMockRes();

    await controller.listMyHospitalReferrals(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: 'list-hospital-referrals-failed' });
  });
});

describe('ReferralController.listMyUpcomingReferrals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when user context is missing', async () => {
    const mockService: any = {
      listUpcomingReferralsByHealthWorker: vi.fn(),
    };
    const controller = new ReferralController(mockService);
    const req = {} as Request;
    const res = createMockRes();

    await controller.listMyUpcomingReferrals(req, res);

    expect(mockService.listUpcomingReferralsByHealthWorker).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ status: 'fail', message: 'Unauthorized: missing user context' });
  });

  it('returns 200 with upcoming referrals for logged-in user', async () => {
    const referrals = [{ id: 'ref-upcoming-1' }];
    const mockService: any = {
      listUpcomingReferralsByHealthWorker: vi.fn().mockResolvedValue(referrals),
    };
    const controller = new ReferralController(mockService);
    const req = { user: { id: 'hw-2' } } as unknown as Request;
    const res = createMockRes();

    await controller.listMyUpcomingReferrals(req, res);

    expect(mockService.listUpcomingReferralsByHealthWorker).toHaveBeenCalledWith('hw-2');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'success', data: { referrals } });
  });

  it('returns 500 when service throws', async () => {
    const mockService: any = {
      listUpcomingReferralsByHealthWorker: vi.fn().mockRejectedValue(new Error('list-upcoming-failed')),
    };
    const controller = new ReferralController(mockService);
    const req = { user: { id: 'hw-2' } } as unknown as Request;
    const res = createMockRes();

    await controller.listMyUpcomingReferrals(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: 'list-upcoming-failed' });
  });
});

describe('ReferralController.countMyPendingReferrals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when user context is missing', async () => {
    const mockService: any = {
      countPendingReferralsByHealthWorker: vi.fn(),
    };
    const controller = new ReferralController(mockService);
    const req = {} as Request;
    const res = createMockRes();

    await controller.countMyPendingReferrals(req, res);

    expect(mockService.countPendingReferralsByHealthWorker).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ status: 'fail', message: 'Unauthorized: missing user context' });
  });

  it('returns 200 with pending referrals count for logged-in user', async () => {
    const mockService: any = {
      countPendingReferralsByHealthWorker: vi.fn().mockResolvedValue(7),
    };
    const controller = new ReferralController(mockService);
    const req = { user: { id: 'hw-3' } } as unknown as Request;
    const res = createMockRes();

    await controller.countMyPendingReferrals(req, res);

    expect(mockService.countPendingReferralsByHealthWorker).toHaveBeenCalledWith('hw-3');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'success', data: { count: 7 } });
  });

  it('returns 500 when service throws', async () => {
    const mockService: any = {
      countPendingReferralsByHealthWorker: vi.fn().mockRejectedValue(new Error('count-failed')),
    };
    const controller = new ReferralController(mockService);
    const req = { user: { id: 'hw-3' } } as unknown as Request;
    const res = createMockRes();

    await controller.countMyPendingReferrals(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: 'count-failed' });
  });
});

describe('ReferralController.getMyReferralStatusOverview', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when user context is missing', async () => {
    const mockService: any = {
      getReferralStatusOverviewByHealthWorker: vi.fn(),
    };
    const controller = new ReferralController(mockService);
    const req = {} as Request;
    const res = createMockRes();

    await controller.getMyReferralStatusOverview(req, res);

    expect(mockService.getReferralStatusOverviewByHealthWorker).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ status: 'fail', message: 'Unauthorized: missing user context' });
  });

  it('returns 200 with referral status summary for logged-in user', async () => {
    const summary = {
      pending: 4,
      completedThisMonth: 12,
      overdue: 1,
    };
    const mockService: any = {
      getReferralStatusOverviewByHealthWorker: vi.fn().mockResolvedValue(summary),
    };
    const controller = new ReferralController(mockService);
    const req = { user: { id: 'hw-4' } } as unknown as Request;
    const res = createMockRes();

    await controller.getMyReferralStatusOverview(req, res);

    expect(mockService.getReferralStatusOverviewByHealthWorker).toHaveBeenCalledWith('hw-4');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      message: 'Referral status overview retrieved successfully',
      data: { summary },
    });
  });

  it('returns 500 when service throws', async () => {
    const mockService: any = {
      getReferralStatusOverviewByHealthWorker: vi.fn().mockRejectedValue(new Error('overview-failed')),
    };
    const controller = new ReferralController(mockService);
    const req = { user: { id: 'hw-4' } } as unknown as Request;
    const res = createMockRes();

    await controller.getMyReferralStatusOverview(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: 'overview-failed' });
  });
});

describe('ReferralController.getReferralById', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when id is missing', async () => {
    const mockService: any = {
      getReferralById: vi.fn(),
    };
    const controller = new ReferralController(mockService);
    const req = { params: {} } as unknown as Request;
    const res = createMockRes();

    await controller.getReferralById(req, res);

    expect(mockService.getReferralById).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ status: 'fail', message: 'Referral id is required' });
  });

  it('returns 404 when referral is not found', async () => {
    const mockService: any = {
      getReferralById: vi.fn().mockResolvedValue(null),
    };
    const controller = new ReferralController(mockService);
    const req = { params: { id: 'ref-404' } } as unknown as Request;
    const res = createMockRes();

    await controller.getReferralById(req, res);

    expect(mockService.getReferralById).toHaveBeenCalledWith('ref-404');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ status: 'fail', message: 'Referral not found' });
  });

  it('returns 200 with referral when found', async () => {
    const referral = {
      id: 'ref-200',
      hospitalId: 'hospital-1',
      status: 'PENDING',
    };
    const mockService: any = {
      getReferralById: vi.fn().mockResolvedValue(referral),
    };
    const controller = new ReferralController(mockService);
    const req = { params: { id: 'ref-200' }, user: { id: 'nurse-1', hospitalId: 'hospital-1' } } as unknown as Request;
    const res = createMockRes();

    await controller.getReferralById(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'success', data: { referral } });
  });

  it('returns 404 when logged-in hospitalId does not match referral hospitalId', async () => {
    const referral = {
      id: 'ref-201',
      hospitalId: 'hospital-1',
      status: 'PENDING',
    };
    const mockService: any = {
      getReferralById: vi.fn().mockResolvedValue(referral),
    };
    const controller = new ReferralController(mockService);
    const req = { params: { id: 'ref-201' }, user: { id: 'nurse-1', hospitalId: 'hospital-2' } } as unknown as Request;
    const res = createMockRes();

    await controller.getReferralById(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ status: 'fail', message: 'Referral not found' });
  });

  it('returns 500 when service throws', async () => {
    const mockService: any = {
      getReferralById: vi.fn().mockRejectedValue(new Error('fetch-referral-failed')),
    };
    const controller = new ReferralController(mockService);
    const req = { params: { id: 'ref-500' } } as unknown as Request;
    const res = createMockRes();

    await controller.getReferralById(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: 'fetch-referral-failed' });
  });
});

describe('ReferralController.completeReferralByPatientNumber', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when patientNumber param is invalid', async () => {
    const mockService: any = {
      completeReferralByPatientNumber: vi.fn(),
    };
    const controller = new ReferralController(mockService);
    const req = { params: { patientNumber: 'abc' } } as unknown as Request;
    const res = createMockRes();

    await controller.completeReferralByPatientNumber(req, res);

    expect(mockService.completeReferralByPatientNumber).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ status: 'fail', message: 'Valid patientNumber is required (param or body)' });
  });

  it('returns 404 when no pending referral is found for patient number', async () => {
    const mockService: any = {
      completeReferralByPatientNumber: vi.fn().mockResolvedValue(null),
    };
    const controller = new ReferralController(mockService);
    const req = { params: { patientNumber: '1001' } } as unknown as Request;
    const res = createMockRes();

    await controller.completeReferralByPatientNumber(req, res);

    expect(mockService.completeReferralByPatientNumber).toHaveBeenCalledWith(1001);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      status: 'fail',
      message: 'No pending referral found for given patient number',
    });
  });

  it('returns 200 with updated referral when completion succeeds', async () => {
    const updatedReferral = {
      id: 'ref-completed',
      status: 'COMPLETED',
    };
    const mockService: any = {
      completeReferralByPatientNumber: vi.fn().mockResolvedValue(updatedReferral),
    };
    const controller = new ReferralController(mockService);
    const req = { params: { patientNumber: '1002' } } as unknown as Request;
    const res = createMockRes();

    await controller.completeReferralByPatientNumber(req, res);

    expect(mockService.completeReferralByPatientNumber).toHaveBeenCalledWith(1002);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'success', data: { referral: updatedReferral } });
  });

  it('returns 500 when service throws', async () => {
    const mockService: any = {
      completeReferralByPatientNumber: vi.fn().mockRejectedValue(new Error('complete-referral-failed')),
    };
    const controller = new ReferralController(mockService);
    const req = { params: { patientNumber: '1003' } } as unknown as Request;
    const res = createMockRes();

    await controller.completeReferralByPatientNumber(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: 'complete-referral-failed' });
  });
});
