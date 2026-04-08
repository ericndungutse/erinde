import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

import ReferralController from "../../controller/referral.controller.js";

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

describe("ReferralController.getReferrals", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 and uses default status validation when status is not provided", async () => {
    const referrals = [{ id: "ref-1" }];
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
      getAllReferrals: vi.fn().mockResolvedValue({ referrals, pagination }),
    };
    const controller = new ReferralController(mockService);
    const req = {
      query: { page: "1", limit: "10" },
      referralFilter: { from: "507f1f77bcf86cd799439011", fromType: "CHU" },
    } as unknown as Request;
    const res = createMockRes();

    await controller.getReferrals(req, res);

    expect(mockService.getAllReferrals).toHaveBeenCalledWith(
      { page: "1", limit: "10" },
      { from: "507f1f77bcf86cd799439011", fromType: "CHU" },
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      data: { referrals, pagination },
    });
  });

  it("returns 200 when status is valid regardless of input case", async () => {
    const mockService: any = {
      getAllReferrals: vi.fn().mockResolvedValue({
        referrals: [],
        pagination: {
          currentPage: 1,
          perPage: 20,
          totalResults: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
          nextPage: null,
          prevPage: null,
        },
      }),
    };
    const controller = new ReferralController(mockService);
    const req = {
      query: { status: "completed" },
    } as unknown as Request;
    const res = createMockRes();

    await controller.getReferrals(req, res);

    expect(mockService.getAllReferrals).toHaveBeenCalledWith(
      { status: "completed" },
      {},
    );
    expect(res.statusCode).toBe(200);
  });

  it("returns 400 when status query is invalid", async () => {
    const mockService: any = {
      getAllReferrals: vi.fn(),
    };
    const controller = new ReferralController(mockService);
    const req = {
      query: { status: "unknown-status" },
    } as unknown as Request;
    const res = createMockRes();

    await controller.getReferrals(req, res);

    expect(mockService.getAllReferrals).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      status: "fail",
      message: "Invalid status. Allowed values: PENDING, COMPLETED, CANCELLED",
    });
  });

  it("returns 500 when service throws", async () => {
    const mockService: any = {
      getAllReferrals: vi
        .fn()
        .mockRejectedValue(new Error("get-all-referrals-failed")),
    };
    const controller = new ReferralController(mockService);
    const req = {
      query: { status: "PENDING" },
      referralFilter: { from: "507f1f77bcf86cd799439011", fromType: "CHU" },
    } as unknown as Request;
    const res = createMockRes();

    await controller.getReferrals(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      status: "error",
      message: "get-all-referrals-failed",
    });
  });
});

describe("ReferralController.getUpcomingReferralsIn48", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls next with error when referralFilter is missing", async () => {
    const mockService: any = {
      getCommingReferralVisitsIn48h: vi.fn(),
    };
    const controller = new ReferralController(mockService);
    const req = {} as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.getUpcomingReferralsIn48(req, res, next);

    expect(mockService.getCommingReferralVisitsIn48h).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const passedError = (next as any).mock.calls[0][0] as Error;
    expect(passedError).toBeInstanceOf(Error);
    expect(passedError.message).toBe("ReferralFilter not present.");
  });

  it("returns 200 with upcoming referrals", async () => {
    const referrals = [
      { id: "ref-1", patientNumber: 1001, status: "PENDING" },
      { id: "ref-2", patientNumber: 1002, status: "PENDING" },
    ];
    const mockService: any = {
      getCommingReferralVisitsIn48h: vi.fn().mockResolvedValue(referrals),
    };
    const controller = new ReferralController(mockService);
    const req = {
      referralFilter: { from: "507f1f77bcf86cd799439011", fromType: "CHU" },
    } as unknown as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.getUpcomingReferralsIn48(req, res, next);

    expect(mockService.getCommingReferralVisitsIn48h).toHaveBeenCalledWith({
      from: "507f1f77bcf86cd799439011",
      fromType: "CHU",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "success", data: { referrals } });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards service errors to next", async () => {
    const serviceError = new Error("failed-upcoming-referrals");
    const mockService: any = {
      getCommingReferralVisitsIn48h: vi.fn().mockRejectedValue(serviceError),
    };
    const controller = new ReferralController(mockService);
    const req = {
      referralFilter: { from: "507f1f77bcf86cd799439011", fromType: "CHU" },
    } as unknown as Request;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.getUpcomingReferralsIn48(req, res, next);

    expect(next).toHaveBeenCalledWith(serviceError);
  });
});

describe("ReferralController.getReferralMetrics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 with referral metrics", async () => {
    const metrics = {
      total: 20,
      pending: 5,
      scheduled_today: 3,
      completed_today: 2,
      overdue: 1,
    };
    const mockService: any = {
      getReferralMetrics: vi.fn().mockResolvedValue(metrics),
    };
    const controller = new ReferralController(mockService);
    const req = {
      referralFilter: { from: "507f1f77bcf86cd799439011", fromType: "CHU" },
    } as unknown as Request;
    const res = createMockRes();

    await controller.getReferralMetrics(req, res);

    expect(mockService.getReferralMetrics).toHaveBeenCalledWith({
      from: "507f1f77bcf86cd799439011",
      fromType: "CHU",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      message: "Referral metrics retrieved successfully",
      data: { metrics },
    });
  });

  it("returns 500 when service throws", async () => {
    const mockService: any = {
      getReferralMetrics: vi
        .fn()
        .mockRejectedValue(new Error("metrics-failed")),
    };
    const controller = new ReferralController(mockService);
    const req = {} as Request;
    const res = createMockRes();

    await controller.getReferralMetrics(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ status: "error", message: "metrics-failed" });
  });
});

// TODO
describe("ReferralController.getReferralById", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when id is missing", async () => {
    const mockService: any = {
      getReferralById: vi.fn(),
    };
    const controller = new ReferralController(mockService);
    const req = { params: {} } as unknown as Request;
    const res = createMockRes();

    await controller.getReferralById(req, res);

    expect(mockService.getReferralById).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      status: "fail",
      message: "Referral id is required",
    });
  });

  it("returns 404 when referral is not found", async () => {
    const mockService: any = {
      getReferralById: vi.fn().mockResolvedValue(null),
    };
    const controller = new ReferralController(mockService);
    const req = { params: { id: "ref-404" } } as unknown as Request;
    const res = createMockRes();

    await controller.getReferralById(req, res);

    expect(mockService.getReferralById).toHaveBeenCalledWith("ref-404");
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ status: "fail", message: "Referral not found" });
  });

  it("returns 200 with referral when found", async () => {
    const referral = {
      id: "ref-200",
      to: "hospital-1",
      status: "PENDING",
    };
    const mockService: any = {
      getReferralById: vi.fn().mockResolvedValue(referral),
    };
    const controller = new ReferralController(mockService);
    const req = {
      params: { id: "ref-200" },
      user: { id: "nurse-1", hospitalId: "hospital-1" },
    } as unknown as Request;
    const res = createMockRes();

    await controller.getReferralById(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "success", data: { referral } });
  });

  it("returns 404 when logged-in hospitalId does not match referral hospitalId", async () => {
    const referral = {
      id: "ref-201",
      to: "hospital-1",
      status: "PENDING",
    };
    const mockService: any = {
      getReferralById: vi.fn().mockResolvedValue(referral),
    };
    const controller = new ReferralController(mockService);
    const req = {
      params: { id: "ref-201" },
      user: { id: "nurse-1", hospitalId: "hospital-2" },
    } as unknown as Request;
    const res = createMockRes();

    await controller.getReferralById(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ status: "fail", message: "Referral not found" });
  });

  it("returns 500 when service throws", async () => {
    const mockService: any = {
      getReferralById: vi
        .fn()
        .mockRejectedValue(new Error("fetch-referral-failed")),
    };
    const controller = new ReferralController(mockService);
    const req = { params: { id: "ref-500" } } as unknown as Request;
    const res = createMockRes();

    await controller.getReferralById(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      status: "error",
      message: "fetch-referral-failed",
    });
  });
});

// GetAllReferrals
