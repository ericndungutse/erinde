import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import EncounterController from "../../controller/encounter.controller.js";
import type { EncounterCreatedResponseDTO } from "../../dto/encounter.dto.js";
import type { IEncounterService } from "../../service/interface/iencounter.service.js";

const mockEncounterService: IEncounterService = {
  createEncounterByNurse: vi.fn(),
};

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

describe("EncounterController.createEncounter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an encounter using nurse context and returns 201", async () => {
    const createdEncounter: EncounterCreatedResponseDTO = {
      id: "encounter-1",
      patientNumber: 1001,
      referralId: "ref-1",
      state: "open",
      currentStep: "triage",
      urgency: "high",
      openedAt: new Date("2026-04-12T09:30:00.000Z"),
    };

    (mockEncounterService.createEncounterByNurse as Mock).mockResolvedValue(
      createdEncounter,
    );

    const controller = new EncounterController(mockEncounterService);

    const req = {
      body: {
        patientNumber: 1001,
        referralId: "ref-1",
        urgency: "high",
      },
      nurseEncounterContext: {
        initiatorId: "nurse-1",
        hospitalId: "hospital-1",
      },
    } as unknown as Request;

    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.createEncounter(req, res, next);

    expect(mockEncounterService.createEncounterByNurse).toHaveBeenCalledWith(
      req.body,
      "nurse-1",
      "hospital-1",
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body).toEqual({
      status: "success",
      message: "Encounter created successfully",
      data: {
        encounter: createdEncounter,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards an error when nurse encounter context is missing", async () => {
    const controller = new EncounterController(mockEncounterService);

    const req = {
      body: {
        patientNumber: 1001,
        urgency: "medium",
      },
    } as unknown as Request;

    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.createEncounter(req, res, next);

    expect(mockEncounterService.createEncounterByNurse).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Nurse encounter context not found" }),
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("forwards service errors to next", async () => {
    const error = new Error("encounter-service-failed");
    const mockService: IEncounterService = {
      createEncounterByNurse: vi.fn().mockRejectedValue(error),
    };

    const controller = new EncounterController(mockService);

    const req = {
      body: {
        patientNumber: 2002,
        urgency: "emergency",
      },
      nurseEncounterContext: {
        initiatorId: "nurse-2",
        hospitalId: "hospital-2",
      },
    } as unknown as Request;

    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await controller.createEncounter(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
