import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CreateEncounterDTO,
  CreateEncounterForNewPatientDTO,
} from "../../dto/encounter.dto.js";
import PatientNotFoundException from "../../Errors/PatientNotFoundException.js";
import ReferralHospitalMismatchError from "../../Errors/ReferralHospitalMismatchError.js";
import Encounter from "../../models/encounter.model.js";
import Referral from "../../models/referral.model.js";
import EncounterService from "../../service/encounter.service.js";
import OpenEncounterAlreadyExistsError from "../../Errors/OpenEncounterAlreadyExistsError.js";
import ReferralNotFoundForPatientNumber from "../../Errors/ReferralNotFoundForPatientNumber.js";

function createSessionMock() {
  return {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    abortTransaction: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined),
  };
}

function createFindOneQuery<T>(result: T) {
  return {
    session: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(result),
  };
}

describe("EncounterService.createEncounterByNurse", () => {
  let session: ReturnType<typeof createSessionMock>;
  let userService: {
    findUserByPatientNumber: ReturnType<typeof vi.fn>;
    registerUser: ReturnType<typeof vi.fn>;
  };
  let service: EncounterService;

  const existingPatientDto: CreateEncounterDTO = {
    patientNumber: 1001,
    urgency: "high",
  } as CreateEncounterDTO;

  const newPatientDto: CreateEncounterForNewPatientDTO = {
    registerUserDto: {
      firstname: "Jane",
      lastname: "Doe",
      birthdate: new Date("1990-01-01"),
      address: {
        province: "kigali",
        district: "gasabo",
        sector: "sector-1",
        cell: "cell-1",
        village: "village-1",
      },
      contact: {
        phone: "0780000000",
      },
      nationalIdentificationNumber: "1199001122334455",
      communityHealthUnit: "chu-1",
    },
    urgency: "medium",
  };

  beforeEach(() => {
    session = createSessionMock();
    userService = {
      findUserByPatientNumber: vi.fn(),
      registerUser: vi.fn(),
    };
    service = new EncounterService(userService as any);
    vi.spyOn(mongoose, "startSession").mockResolvedValue(session as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an encounter for an existing patient and links the latest pending referral", async () => {
    const referralDoc = {
      _id: "ref-1",
      id: "ref-1",
      to: "hospital-1",
      status: "PENDING",
      save: vi.fn().mockResolvedValue(undefined),
    };
    const createdEncounter = {
      id: "enc-1",
      patientNumber: 1001,
      referralId: "ref-1",
      state: "open",
      currentStep: "triage",
      urgency: "high",
      openedAt: new Date("2026-04-12T10:00:00.000Z"),
    };

    userService.findUserByPatientNumber.mockResolvedValue({ id: "patient-1" });
    const openEncounterQuery = createFindOneQuery(null);
    const referralQuery = createFindOneQuery(referralDoc);
    const createSpy = vi
      .spyOn(Encounter, "create")
      .mockResolvedValue([createdEncounter] as any);
    vi.spyOn(Encounter, "findOne").mockReturnValue(openEncounterQuery as any);
    vi.spyOn(Referral, "findOne").mockReturnValue(referralQuery as any);

    const result = await service.createEncounterByNurse(
      existingPatientDto,
      "nurse-1",
      "hospital-1",
    );

    expect(userService.findUserByPatientNumber).toHaveBeenCalledWith(1001);
    expect(Encounter.findOne).toHaveBeenCalledWith({
      patientNumber: 1001,
      state: "open",
    });
    expect(referralQuery.session).toHaveBeenCalledWith(session);
    expect(referralQuery.sort).toHaveBeenCalledWith({ referralDate: -1 });
    expect(referralDoc.save).toHaveBeenCalledWith({ session });
    expect(referralDoc.status).toBe("COMPLETED");
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: "enc-1",
      patientNumber: 1001,
      referralId: "ref-1",
      state: "open",
      currentStep: "triage",
      urgency: "high",
      openedAt: createdEncounter.openedAt,
    });
    expect(session.startTransaction).toHaveBeenCalledOnce();
    expect(session.commitTransaction).toHaveBeenCalledOnce();
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("creates an encounter without a referral when no pending referral exists", async () => {
    const createdEncounter = {
      id: "enc-2",
      patientNumber: 2001,
      referralId: null,
      state: "open",
      currentStep: "triage",
      urgency: "medium",
      openedAt: new Date("2026-04-12T11:00:00.000Z"),
    };

    userService.findUserByPatientNumber.mockResolvedValue({ id: "patient-2" });
    vi.spyOn(Encounter, "findOne").mockReturnValue(
      createFindOneQuery(null) as any,
    );
    const referralQuery = createFindOneQuery(null);
    vi.spyOn(Referral, "findOne").mockReturnValue(referralQuery as any);
    const createSpy = vi
      .spyOn(Encounter, "create")
      .mockResolvedValue([createdEncounter] as any);

    const result = await service.createEncounterByNurse(
      existingPatientDto,
      "nurse-2",
      "hospital-2",
    );

    expect(referralQuery.exec).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(result.referralId).toBeNull();
    expect(session.commitTransaction).toHaveBeenCalledOnce();
    expect(session.abortTransaction).not.toHaveBeenCalled();
  });

  it("rejects a referral when its destination hospital does not match the nurse hospital", async () => {
    const referralDoc = {
      _id: "ref-2",
      id: "ref-2",
      to: "hospital-b",
      status: "PENDING",
      save: vi.fn(),
    };

    userService.findUserByPatientNumber.mockResolvedValue({ id: "patient-3" });
    vi.spyOn(Encounter, "findOne").mockReturnValue(
      createFindOneQuery(null) as any,
    );
    vi.spyOn(Referral, "findOne").mockReturnValue(
      createFindOneQuery(referralDoc) as any,
    );
    const createSpy = vi.spyOn(Encounter, "create");

    await expect(
      service.createEncounterByNurse(
        existingPatientDto,
        "nurse-3",
        "hospital-a",
      ),
    ).rejects.toBeInstanceOf(ReferralHospitalMismatchError);

    expect(referralDoc.save).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("rejects when the requested referral id does not exist for the patient", async () => {
    const dtoWithReferralId = {
      patientNumber: 1001,
      referralId: "missing-ref",
      urgency: "high",
    } as CreateEncounterDTO;

    userService.findUserByPatientNumber.mockResolvedValue({ id: "patient-4" });
    vi.spyOn(Encounter, "findOne").mockReturnValue(
      createFindOneQuery(null) as any,
    );
    vi.spyOn(Referral, "findOne").mockReturnValue(
      createFindOneQuery(null) as any,
    );
    const createSpy = vi.spyOn(Encounter, "create");

    await expect(
      service.createEncounterByNurse(
        dtoWithReferralId,
        "nurse-4",
        "hospital-1",
      ),
    ).rejects.toThrow(new ReferralNotFoundForPatientNumber());

    expect(createSpy).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("rejects when the patient has an existing open encounter", async () => {
    userService.findUserByPatientNumber.mockResolvedValue({ id: "patient-5" });
    vi.spyOn(Encounter, "findOne").mockReturnValue(
      createFindOneQuery({ _id: "open-encounter-1" }) as any,
    );
    const referralSpy = vi.spyOn(Referral, "findOne");
    const createSpy = vi.spyOn(Encounter, "create");

    await expect(
      service.createEncounterByNurse(
        existingPatientDto,
        "nurse-5",
        "hospital-1",
      ),
    ).rejects.toThrow(new OpenEncounterAlreadyExistsError());

    expect(referralSpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("registers a new patient and creates the encounter without referral lookup", async () => {
    const registeredUser = { patientNumber: 9001 };
    const createdEncounter = {
      id: "enc-9",
      patientNumber: 9001,
      referralId: null,
      state: "open",
      currentStep: "triage",
      urgency: "medium",
      openedAt: new Date("2026-04-12T12:00:00.000Z"),
    };

    userService.registerUser.mockResolvedValue(registeredUser);
    vi.spyOn(Encounter, "findOne").mockReturnValue(
      createFindOneQuery(null) as any,
    );
    const referralSpy = vi.spyOn(Referral, "findOne");
    const createSpy = vi
      .spyOn(Encounter, "create")
      .mockResolvedValue([createdEncounter] as any);

    const result = await service.createEncounterByNurse(
      newPatientDto,
      "nurse-9",
      "hospital-9",
    );

    expect(userService.registerUser).toHaveBeenCalledWith(
      newPatientDto.registerUserDto,
    );
    expect(referralSpy).not.toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(result.patientNumber).toBe(9001);
    expect(session.commitTransaction).toHaveBeenCalledOnce();
    expect(session.abortTransaction).not.toHaveBeenCalled();
  });

  it("rejects when the existing patient cannot be found", async () => {
    userService.findUserByPatientNumber.mockResolvedValue(null);
    const createSpy = vi.spyOn(Encounter, "create");
    vi.spyOn(Encounter, "findOne").mockReturnValue(
      createFindOneQuery(null) as any,
    );

    await expect(
      service.createEncounterByNurse(
        existingPatientDto,
        "nurse-6",
        "hospital-1",
      ),
    ).rejects.toBeInstanceOf(PatientNotFoundException);

    expect(createSpy).not.toHaveBeenCalled();
    expect(mongoose.startSession).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).not.toHaveBeenCalled();
  });
});
