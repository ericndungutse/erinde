import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import mongoose, { Mongoose } from "mongoose";

import Indicator from "../../models/indicator.model.js";
import { Assessment } from "../../models/assessment.model.js";
import CommunityHealthUnit from "../../models/communitHealthUnit.model.js";
import { AssessmentCreationError } from "../../Errors/AssessmentCreationError.js";
import IndicatorNotFound from "../../Errors/IndicatorNotFoundError.js";
import InvalidUnit from "../../Errors/InvalidUnits.js";
import PatientNotFoundException from "../../Errors/PatientNotFoundException.js";
import { ModelNames } from "../../constants/constant.values.js";
import AssessmentClassifier from "../../service/assessment-classifier.service.js";
import AssessmentService from "../../service/assessment.service.js";
import type { RecentAssessmentSummaryDTO } from "../../dto/assessmentDto.js";

function createSessionMock() {
  return {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    abortTransaction: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn(),
  };
}

/** Indicator.findById in service uses `.lean()` only (no session). */
function createIndicatorLeanQuery<T>(result: T) {
  return {
    lean: vi.fn().mockResolvedValue(result),
  };
}

function createAssessmentQueryChain<T>(execResult: T) {
  const exec = vi.fn().mockResolvedValue(execResult);
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec,
  };
}

describe("AssessmentService.createAssessment", () => {
  const diabetesDto = {
    patientNumber: 1001,
    indicator: "indicator-diabetes",
    takenFrom: "chu-1",
    takenFromType: ModelNames.CommunityHealthUnit,
    readings: {
      random_blood_glucose: {
        value: 139,
        unit: "mg/dL",
      },
    },
  };

  const hypertensionDto = {
    patientNumber: 2001,
    indicator: "indicator-hypertension",
    takenFrom: "chu-1",
    takenFromType: ModelNames.CommunityHealthUnit,
    readings: {
      systolic_blood_pressure: {
        value: 180,
        unit: "mmHg",
      },
      diastolic_blood_pressure: {
        value: 120,
        unit: "mmHg",
      },
    },
  };

  let session: ReturnType<typeof createSessionMock>;
  let referralService: {
    createReferral: ReturnType<typeof vi.fn>;
  };
  let userService: {
    findUserByPatientNumber: ReturnType<typeof vi.fn>;
  };
  let communityHealthUnitService: {
    getCommunityHealthUnitById: ReturnType<typeof vi.fn>;
  };
  let service: AssessmentService;

  beforeEach(() => {
    session = createSessionMock();

    referralService = {
      createReferral: vi.fn().mockResolvedValue(undefined),
    };

    userService = {
      findUserByPatientNumber: vi.fn().mockResolvedValue({
        id: "patient-1",
        district: "Kigali",
        communityHealthUnit: "chu-1",
      }),
    };

    communityHealthUnitService = {
      getCommunityHealthUnitById: vi.fn().mockResolvedValue({
        _id: "chu-1",
        name: "chu-1",
        socialHealthWorker: null,
        healthCenter: "hospital-1",
        address: {} as any,
      }),
    };

    service = new AssessmentService(
      referralService as any,
      userService as any,
      communityHealthUnitService as any,
    );

    vi.spyOn(mongoose, "startSession").mockResolvedValue(session as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  type CreatedAssessmentDoc = {
    id: string;
    readings: typeof diabetesDto.readings | typeof hypertensionDto.readings;
    classification: { label: string; status_code: string };
    recommendations: string[];
    takenFrom: string;
    takenFromType: ModelNames;
    patientNumber: number;
  };

  function createdAssessmentMock(
    base: {
      takenFrom: string;
      takenFromType: ModelNames;
      patientNumber: number;
    },
    fields: Pick<
      CreatedAssessmentDoc,
      "id" | "readings" | "classification" | "recommendations"
    >,
  ): CreatedAssessmentDoc {
    return {
      takenFrom: base.takenFrom,
      takenFromType: base.takenFromType,
      patientNumber: base.patientNumber,
      ...fields,
    };
  }

  it("creates a healthy diabetes assessment and commits without creating a referral", async () => {
    const indicatorDoc = {
      name: "diabetes",
      readings: [{ type: "random_blood_glucose", unit: "mg/dL" }],
      classifications: [],
    };
    const classificationResult = {
      classification: {
        label: "Normal",
        status_code: "healthy" as const,
      },
      recommendations: ["Komeza kurya indyo yuzuye"],
    };
    const createdAssessment = createdAssessmentMock(diabetesDto, {
      id: "assessment-1",
      readings: diabetesDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    });

    const indicatorQuery = createIndicatorLeanQuery(indicatorDoc);

    vi.spyOn(Indicator, "findById").mockReturnValue(indicatorQuery as any);
    vi.spyOn(
      AssessmentClassifier.prototype,
      "classifyDiabetes",
    ).mockReturnValue(classificationResult);
    const createSpy = vi
      .spyOn(Assessment, "create")
      .mockResolvedValue([createdAssessment] as any);

    const result = await service.createAssessment(
      diabetesDto as any,
      "evaluator-1",
    );

    expect(Indicator.findById).toHaveBeenCalledWith(diabetesDto.indicator);
    expect(userService.findUserByPatientNumber).toHaveBeenCalledWith(
      diabetesDto.patientNumber,
      session,
    );
    expect(
      AssessmentClassifier.prototype.classifyDiabetes,
    ).toHaveBeenCalledWith(diabetesDto.readings, indicatorDoc);
    expect(createSpy).toHaveBeenCalledTimes(1);

    const [assessmentDocs, createOptions] = createSpy.mock
      .calls[0] as unknown as [any[], { session: unknown }];
    const assessmentPayload = assessmentDocs[0];

    expect(createOptions).toEqual({ session });
    expect(assessmentPayload.patient).toBe("patient-1");
    expect(assessmentPayload.patientNumber).toBe(diabetesDto.patientNumber);
    expect(assessmentPayload.indicator).toBe(diabetesDto.indicator);
    expect(assessmentPayload.evaluatedBy).toBe("evaluator-1");
    expect(assessmentPayload.readings).toEqual(diabetesDto.readings);
    expect(assessmentPayload.takenFrom).toBe(diabetesDto.takenFrom);
    expect(assessmentPayload.takenFromType).toBe(diabetesDto.takenFromType);
    expect(assessmentPayload.classification).toEqual(
      classificationResult.classification,
    );
    expect(assessmentPayload.recommendations).toEqual(
      classificationResult.recommendations,
    );
    expect(assessmentPayload.evaluatedAt).toBeInstanceOf(Date);
    expect(assessmentPayload.evaluatedDate).toBeInstanceOf(Date);

    expect(referralService.createReferral).not.toHaveBeenCalled();
    expect(session.startTransaction).toHaveBeenCalledOnce();
    expect(session.commitTransaction).toHaveBeenCalledOnce();
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledOnce();
    expect(result).toEqual({
      id: createdAssessment.id,
      readings: createdAssessment.readings,
      classification: createdAssessment.classification,
      recommendations: createdAssessment.recommendations,
      takenFrom: createdAssessment.takenFrom,
      takenFromType: createdAssessment.takenFromType,
      patientNumber: createdAssessment.patientNumber,
    });
  });

  it("creates a referral for an abnormal hypertension assessment", async () => {
    const indicatorDoc = {
      name: "hypertension",
      readings: [
        { type: "systolic_blood_pressure", unit: "mmHg" },
        { type: "diastolic_blood_pressure", unit: "mmHg" },
      ],
      classifications: [],
    };
    const classificationResult = {
      classification: {
        label: "Hypertensive Crisis",
        status_code: "critical" as const,
      },
      recommendations: ["Gana ivuriro ryihuse bitarenze uyu munsi"],
    };
    const createdAssessment = createdAssessmentMock(hypertensionDto, {
      id: "assessment-2",
      readings: hypertensionDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    });

    userService.findUserByPatientNumber.mockResolvedValue({
      id: "patient-2",
      district: "Kigali",
      communityHealthUnit: "chu-1",
    });
    vi.spyOn(Indicator, "findById").mockReturnValue(
      createIndicatorLeanQuery(indicatorDoc) as any,
    );
    vi.spyOn(
      AssessmentClassifier.prototype,
      "classifyHypertension",
    ).mockReturnValue(classificationResult);
    vi.spyOn(Assessment, "create").mockResolvedValue([
      createdAssessment,
    ] as any);

    const result = await service.createAssessment(
      hypertensionDto as any,
      "evaluator-2",
    );

    expect(
      AssessmentClassifier.prototype.classifyHypertension,
    ).toHaveBeenCalledWith(hypertensionDto.readings, indicatorDoc);
    expect(referralService.createReferral).toHaveBeenCalledWith(
      "assessment-2",
      "patient-2",
      "evaluator-2",
      hypertensionDto.takenFrom,
      hypertensionDto.takenFromType,
      "hospital-1",
      undefined,
      session,
    );
    expect(session.commitTransaction).toHaveBeenCalledOnce();
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: createdAssessment.id,
      readings: createdAssessment.readings,
      classification: createdAssessment.classification,
      recommendations: createdAssessment.recommendations,
      takenFrom: createdAssessment.takenFrom,
      takenFromType: createdAssessment.takenFromType,
      patientNumber: createdAssessment.patientNumber,
    });
  });

  it("passes existing pending referral through to referral service when provided", async () => {
    const indicatorDoc = {
      name: "hypertension",
      readings: [
        { type: "systolic_blood_pressure", unit: "mmHg" },
        { type: "diastolic_blood_pressure", unit: "mmHg" },
      ],
      classifications: [],
    };
    const classificationResult = {
      classification: {
        label: "Hypertensive Crisis",
        status_code: "critical" as const,
      },
      recommendations: ["Gana ivuriro ryihuse bitarenze uyu munsi"],
    };
    const createdAssessment = createdAssessmentMock(hypertensionDto, {
      id: "assessment-pending",
      readings: hypertensionDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    });
    const existingPending = { _id: "pending-ref-1" } as any;

    userService.findUserByPatientNumber.mockResolvedValue({
      id: "patient-p",
      district: "Kigali",
      communityHealthUnit: "chu-1",
    });
    vi.spyOn(Indicator, "findById").mockReturnValue(
      createIndicatorLeanQuery(indicatorDoc) as any,
    );
    vi.spyOn(
      AssessmentClassifier.prototype,
      "classifyHypertension",
    ).mockReturnValue(classificationResult);
    vi.spyOn(Assessment, "create").mockResolvedValue([
      createdAssessment,
    ] as any);

    await service.createAssessment(
      hypertensionDto as any,
      "evaluator-p",
      existingPending,
    );

    expect(referralService.createReferral).toHaveBeenCalledWith(
      "assessment-pending",
      "patient-p",
      "evaluator-p",
      hypertensionDto.takenFrom,
      hypertensionDto.takenFromType,
      "hospital-1",
      existingPending,
      session,
    );
  });

  it("uses CHU healthCenter as destination when creating a referral", async () => {
    const indicatorDoc = {
      name: "hypertension",
      readings: [
        { type: "systolic_blood_pressure", unit: "mmHg" },
        { type: "diastolic_blood_pressure", unit: "mmHg" },
      ],
      classifications: [],
    };
    const classificationResult = {
      classification: {
        label: "Hypertensive Crisis",
        status_code: "critical" as const,
      },
      recommendations: ["Gana ivuriro ryihuse bitarenze uyu munsi"],
    };
    const createdAssessment = createdAssessmentMock(hypertensionDto, {
      id: "assessment-3",
      readings: hypertensionDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    });

    userService.findUserByPatientNumber.mockResolvedValue({
      id: "patient-3",
      district: "Musanze",
      communityHealthUnit: "chu-musanze",
    });
    communityHealthUnitService.getCommunityHealthUnitById.mockResolvedValue({
      _id: "chu-musanze",
      name: "chu-musanze",
      socialHealthWorker: null,
      healthCenter: "hospital-musanze",
      address: {} as any,
    });
    vi.spyOn(Indicator, "findById").mockReturnValue(
      createIndicatorLeanQuery(indicatorDoc) as any,
    );
    vi.spyOn(
      AssessmentClassifier.prototype,
      "classifyHypertension",
    ).mockReturnValue(classificationResult);
    vi.spyOn(Assessment, "create").mockResolvedValue([
      createdAssessment,
    ] as any);

    await service.createAssessment(hypertensionDto as any, "evaluator-3");

    expect(
      communityHealthUnitService.getCommunityHealthUnitById,
    ).toHaveBeenCalledWith("chu-musanze");

    expect(referralService.createReferral).toHaveBeenCalledWith(
      "assessment-3",
      "patient-3",
      "evaluator-3",
      hypertensionDto.takenFrom,
      hypertensionDto.takenFromType,
      "hospital-musanze",
      undefined,
      session,
    );
  });

  it("throws when referral source is not CHU for abnormal assessment", async () => {
    const indicatorDoc = {
      name: "hypertension",
      readings: [
        { type: "systolic_blood_pressure", unit: "mmHg" },
        { type: "diastolic_blood_pressure", unit: "mmHg" },
      ],
      classifications: [],
    };
    const classificationResult = {
      classification: {
        label: "Hypertensive Crisis",
        status_code: "critical" as const,
      },
      recommendations: ["Gana ivuriro ryihuse bitarenze uyu munsi"],
    };
    const nonChuDto = {
      ...hypertensionDto,
      takenFromType: ModelNames.Hospital,
    };

    const createdAssessment = createdAssessmentMock(nonChuDto, {
      id: "assessment-4",
      readings: hypertensionDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    });

    userService.findUserByPatientNumber.mockResolvedValue({
      id: "patient-4",
      district: "Nyagatare",
      communityHealthUnit: "hospital-nyagatare",
    });
    vi.spyOn(Indicator, "findById").mockReturnValue(
      createIndicatorLeanQuery(indicatorDoc) as any,
    );
    vi.spyOn(
      AssessmentClassifier.prototype,
      "classifyHypertension",
    ).mockReturnValue(classificationResult);
    const createSpy = vi
      .spyOn(Assessment, "create")
      .mockResolvedValue([createdAssessment] as any);

    await expect(
      service.createAssessment(nonChuDto as any, "evaluator-4"),
    ).rejects.toThrow(
      "Referral creation for non-CHU sources is not implemented yet",
    );

    expect(createSpy).toHaveBeenCalledOnce();
    expect(referralService.createReferral).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("throws IndicatorNotFound when the indicator does not exist", async () => {
    vi.spyOn(Indicator, "findById").mockReturnValue(
      createIndicatorLeanQuery(null) as any,
    );
    const assessmentCreateSpy = vi.spyOn(Assessment, "create");

    await expect(
      service.createAssessment(diabetesDto as any, "evaluator-1"),
    ).rejects.toBeInstanceOf(IndicatorNotFound);

    expect(assessmentCreateSpy).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("throws PatientNotFoundException when the patient clinical profile does not exist", async () => {
    const indicatorDoc = {
      name: "diabetes",
      readings: [{ type: "random_blood_glucose", unit: "mg/dL" }],
      classifications: [],
    };

    userService.findUserByPatientNumber.mockRejectedValue(
      new PatientNotFoundException(),
    );
    vi.spyOn(Indicator, "findById").mockReturnValue(
      createIndicatorLeanQuery(indicatorDoc) as any,
    );
    const createSpy = vi.spyOn(Assessment, "create");

    await expect(
      service.createAssessment(diabetesDto as any, "evaluator-1"),
    ).rejects.toBeInstanceOf(PatientNotFoundException);

    expect(createSpy).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("throws InvalidUnit when submitted units do not match indicator configuration", async () => {
    const indicatorDoc = {
      name: "diabetes",
      readings: [{ type: "random_blood_glucose", unit: "mg/dL" }],
      classifications: [],
    };
    const dtoWithWrongUnit = {
      ...diabetesDto,
      readings: {
        random_blood_glucose: {
          value: 139,
          unit: "mmol/L",
        },
      },
    };

    vi.spyOn(Indicator, "findById").mockReturnValue(
      createIndicatorLeanQuery(indicatorDoc) as any,
    );
    const classifySpy = vi.spyOn(
      AssessmentClassifier.prototype,
      "classifyDiabetes",
    );
    const createSpy = vi.spyOn(Assessment, "create");

    let thrownError: unknown;

    try {
      await service.createAssessment(dtoWithWrongUnit as any, "evaluator-1");
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(InvalidUnit);
    expect(thrownError).toMatchObject({
      message:
        "Reading unit mismatch: random_blood_glucose expects unit mg/dL but got mmol/L",
    });

    expect(classifySpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
  });

  it("throws AssessmentCreationError when Assessment.create does not return a created document", async () => {
    const indicatorDoc = {
      name: "diabetes",
      readings: [{ type: "random_blood_glucose", unit: "mg/dL" }],
      classifications: [],
    };
    const classificationResult = {
      classification: {
        label: "Normal",
        status_code: "healthy" as const,
      },
      recommendations: ["Komeza kurya indyo yuzuye"],
    };

    vi.spyOn(Indicator, "findById").mockReturnValue(
      createIndicatorLeanQuery(indicatorDoc) as any,
    );
    vi.spyOn(
      AssessmentClassifier.prototype,
      "classifyDiabetes",
    ).mockReturnValue(classificationResult);
    vi.spyOn(Assessment, "create").mockResolvedValue([] as any);

    await expect(
      service.createAssessment(diabetesDto as any, "evaluator-1"),
    ).rejects.toBeInstanceOf(AssessmentCreationError);

    expect(referralService.createReferral).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });
});

describe("AssessmentService.getAssessmentIndicator", () => {
  let service: AssessmentService;

  beforeEach(() => {
    service = new AssessmentService(
      { createReferral: vi.fn() } as any,
      { findUserByPatientNumber: vi.fn() } as any,
      { getCommunityHealthUnitById: vi.fn() } as any,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns indicator projection from Assessment.findById", async () => {
    const leanResult = { indicator: new mongoose.Types.ObjectId() };
    const exec = vi.fn().mockResolvedValue(leanResult);
    const lean = vi.fn().mockReturnValue({ exec });
    const select = vi.fn().mockReturnValue({ lean });
    vi.spyOn(Assessment, "findById").mockReturnValue({ select } as any);

    const result = await service.getAssessmentIndicator("aid-1");

    expect(Assessment.findById).toHaveBeenCalledWith("aid-1");
    expect(select).toHaveBeenCalledWith("indicator");
    expect(result).toBe(leanResult);
  });
});

describe("AssessmentService.listAssessmentsByEvaluatorLast24Hours", () => {
  let service: AssessmentService;

  beforeEach(() => {
    service = new AssessmentService(
      { createReferral: vi.fn() } as any,
      { findUserByPatientNumber: vi.fn() } as any,
      { getCommunityHealthUnitById: vi.fn() } as any,
    );
  });

  it("queries with evaluatorId and a $gte boundary ~24 hours ago", async () => {
    // Mock Chain
    const execMock = vi.fn();
    const leanMock = vi.fn(() => ({ exec: execMock }));
    const populateMock = vi.fn(() => ({
      populate: populateMock,
      lean: leanMock,
    }));
    const selectMock = vi.fn(() => ({ populate: populateMock }));
    const findMock = vi.fn(() => ({ select: selectMock }));

    // Tell What find() on Assessment should call
    vi.spyOn(Assessment, "find").mockImplementation(findMock as any);

    const mockResult: RecentAssessmentSummaryDTO[] = [
      {
        _id: "507f1f77bcf86cd799439011",
        patientNumber: 1001,
        patient: {
          _id: "507f1f77bcf86cd799439012",
          firstname: "John",
          lastname: "Doe",
        },
        indicator: {
          _id: "507f1f77bcf86cd799439013",
          name: "hypertension",
        },
        classification: {
          label: "High Risk",
          status_code: "high",
        },
      },
    ];
    execMock.mockResolvedValue(mockResult);

    const evaluatorId = "507f1f77bcf86cd799439011";

    const result =
      await service.listAssessmentsByEvaluatorLast24Hours(evaluatorId);

    expect(result).toEqual(mockResult);
    expect(Assessment.find).toHaveBeenCalledWith(
      expect.objectContaining({
        evaluatedBy: expect.any(mongoose.Types.ObjectId),
        evaluatedAt: {
          $gte: expect.any(Date),
        },
      }),
    );

    expect(populateMock).toHaveBeenNthCalledWith(
      1,
      "patient",
      "_id firstname lastname",
    );
    expect(populateMock).toHaveBeenNthCalledWith(2, "indicator", "_id name");

    const now = new Date();

    // First Call to find should have evaluatedAt with $gte of ~24 hours ago
    const findCallArgs = (Assessment.find as any).mock.calls[0][0];

    expect(
      findCallArgs.evaluatedAt.$gte.getTime() + 24 * 60 * 60 * 1000,
    ).toBeLessThanOrEqual(now.getTime());
  });
});
