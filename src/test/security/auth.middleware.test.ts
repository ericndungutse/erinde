import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "../../types/roles.types.js";

const { verifyTokenMock, findByIdMock } = vi.hoisted(() => ({
  verifyTokenMock: vi.fn(),
  findByIdMock: vi.fn(),
}));

vi.mock("../../security/jwt.utils.js", () => ({
  verifyToken: verifyTokenMock,
}));

vi.mock("../../models/user.model.js", () => ({
  default: {
    findById: findByIdMock,
  },
}));

import { protect } from "../../security/auth.middleware.js";

function createResponse(): Response {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  return response as unknown as Response;
}

describe("protect middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds hospitalId to req.user for nurse tokens", async () => {
    verifyTokenMock.mockReturnValue({
      sub: "nurse-user-id",
      hospitalId: "hospital-id-1",
    });
    findByIdMock.mockResolvedValue({
      id: "nurse-user-id",
      roles: [UserRole.NURSE],
      communityHealthUnit: {
        id: "chu-id-1",
        name: "Community Health Unit 1",
      },
      managedCommunityHealthUnit: {
        id: undefined,
        name: undefined,
      },
    });

    const req = {
      headers: {
        authorization: "Bearer valid-token",
      },
    } as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await protect(req, res, next);

    expect(req.user).toEqual({
      id: "nurse-user-id",
      roles: [UserRole.NURSE],
      hospitalId: "hospital-id-1",
      communityHealthUnit: {
        id: "chu-id-1",
        name: "Community Health Unit 1",
      },
      managedCommunityHealthUnit: {
        id: undefined,
        name: undefined,
      },
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("does not add hospitalId to req.user for non-nurse tokens", async () => {
    verifyTokenMock.mockReturnValue({
      sub: "admin-user-id",
      hospitalId: "hospital-id-1",
    });
    findByIdMock.mockResolvedValue({
      id: "admin-user-id",
      roles: [UserRole.ADMIN],
      communityHealthUnit: {
        id: "chu-id-1",
        name: "Community Health Unit 1",
      },
      managedCommunityHealthUnit: {
        id: undefined,
        name: undefined,
      },
    });

    const req = {
      headers: {
        authorization: "Bearer valid-token",
      },
    } as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await protect(req, res, next);

    expect(req.user).toEqual({
      id: "admin-user-id",
      roles: [UserRole.ADMIN],
      hospitalId: undefined,
      communityHealthUnit: {
        id: "chu-id-1",
        name: "Community Health Unit 1",
      },
      managedCommunityHealthUnit: {
        id: undefined,
        name: undefined,
      },
    });
    expect(next).toHaveBeenCalledOnce();
  });
});
