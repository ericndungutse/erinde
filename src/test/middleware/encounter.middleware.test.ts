import type { NextFunction, Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import ParameterIsRequiredError from "../../Errors/ParameterIsRequiredError.js";
import { resolveNurseEncounterContext } from "../../middleware/encounter.middleware.js";

describe("resolveNurseEncounterContext", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createNextMock() {
    return vi.fn() as unknown as NextFunction & {
      mock: { calls: unknown[][] };
    };
  }

  it("attaches nurse encounter context when user has id and hospitalId", () => {
    const req = {
      user: {
        id: "nurse-1",
        hospitalId: "hospital-1",
      },
    } as unknown as Request;
    const res = {} as Response;
    const next = createNextMock();

    resolveNurseEncounterContext(req, res, next);

    expect(req.nurseEncounterContext).toEqual({
      initiatorId: "nurse-1",
      hospitalId: "hospital-1",
    });
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it("forwards ParameterIsRequiredError when user id is missing", () => {
    const req = {
      user: {
        hospitalId: "hospital-1",
      },
    } as unknown as Request;
    const res = {} as Response;
    const next = createNextMock();

    resolveNurseEncounterContext(req, res, next);

    expect(req.nurseEncounterContext).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "parameter_required",
        parameter: "initiatorId",
        statusCode: 400,
      }),
    );
    const firstError = next.mock.calls[0]?.[0];
    expect(firstError).toBeInstanceOf(ParameterIsRequiredError);
  });

  it("forwards ParameterIsRequiredError when hospitalId is missing", () => {
    const req = {
      user: {
        id: "nurse-2",
      },
    } as unknown as Request;
    const res = {} as Response;
    const next = createNextMock();

    resolveNurseEncounterContext(req, res, next);

    expect(req.nurseEncounterContext).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "parameter_required",
        parameter: "hospitalId",
        statusCode: 400,
      }),
    );
    const firstError = next.mock.calls[0]?.[0];
    expect(firstError).toBeInstanceOf(ParameterIsRequiredError);
  });
});
