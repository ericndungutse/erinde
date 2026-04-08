import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ClinicalProfile from "../../models/clinicalProfile.model.js";
import { Assessment } from "../../models/assessment.model.js";
import { ModelNames } from "../../constants/constant.values.js";
import Referral from "../../models/referral.model.js";
import ReferralService from "../../service/referral.service.js";

function createSessionExecQuery<T>(result: T) {
  return {
    session: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(result),
  };
}

function createSessionLeanExecQuery<T>(result: T) {
  return {
    session: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(result),
  };
}

// TODO CHECK THIS ONE
describe("ReferralService.createReferral", () => {
  const fixedNow = new Date(2026, 2, 10, 14, 30, 0, 0);
  const session = { id: "session-1" };
  let service: ReferralService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    vi.spyOn(console, "log").mockImplementation(() => {});
    service = new ReferralService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("appends assessment to provided pending referral and saves it", async () => {
    const existingReferral = {
      assessments: ["assessment-old"],
      save: vi.fn().mockResolvedValue(undefined),
    };
    const assessmentDoc = { _id: "assessment-new" };
    const clinicalProfile = {
      _id: "clinical-profile-1",
      patientNumber: 1001,
    };
    const assessmentQuery = createSessionLeanExecQuery(assessmentDoc);
    const clinicalQuery = createSessionLeanExecQuery(clinicalProfile);
    const createSpy = vi.spyOn(Referral, "create").mockResolvedValue([] as any);

    vi.spyOn(Assessment, "findById").mockReturnValue(assessmentQuery as any);
    vi.spyOn(ClinicalProfile, "findOne").mockReturnValue(clinicalQuery as any);

    await service.createReferral(
      "assessment-new",
      "patient-1",
      "user-1",
      "chu-1",
      ModelNames.CommunityHealthUnit,
      "hospital-1",
      existingReferral as any,
      session as any,
    );

    expect(assessmentQuery.session).toHaveBeenCalledWith(session);
    expect(clinicalQuery.session).toHaveBeenCalledWith(session);
    expect(existingReferral.assessments).toEqual([
      "assessment-old",
      "assessment-new",
    ]);
    expect(existingReferral.save).toHaveBeenCalledWith({ session });
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it("does not save when existing referral already contains assessment id", async () => {
    const existingReferral = {
      assessments: ["assessment-existing"],
      save: vi.fn().mockResolvedValue(undefined),
    };
    const assessmentDoc = { _id: "assessment-existing" };
    const clinicalProfile = {
      _id: "clinical-profile-1",
      patientNumber: 1001,
    };
    const assessmentQuery = createSessionLeanExecQuery(assessmentDoc);
    const clinicalQuery = createSessionLeanExecQuery(clinicalProfile);
    const createSpy = vi.spyOn(Referral, "create").mockResolvedValue([] as any);

    vi.spyOn(Assessment, "findById").mockReturnValue(assessmentQuery as any);
    vi.spyOn(ClinicalProfile, "findOne").mockReturnValue(clinicalQuery as any);

    await service.createReferral(
      "assessment-existing",
      "patient-1",
      "user-1",
      "chu-1",
      ModelNames.CommunityHealthUnit,
      "hospital-1",
      existingReferral as any,
      session as any,
    );

    expect(existingReferral.assessments).toEqual(["assessment-existing"]);
    expect(existingReferral.save).not.toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it("creates a new referral when no existingPendingReferral is provided", async () => {
    const assessmentDoc = { _id: "assessment-1" };
    const clinicalProfile = {
      _id: "clinical-profile-1",
      patientNumber: 1001,
    };
    const assessmentQuery = createSessionLeanExecQuery(assessmentDoc);
    const clinicalQuery = createSessionLeanExecQuery(clinicalProfile);
    const createSpy = vi.spyOn(Referral, "create").mockResolvedValue([] as any);

    vi.spyOn(Assessment, "findById").mockReturnValue(assessmentQuery as any);
    vi.spyOn(ClinicalProfile, "findOne").mockReturnValue(clinicalQuery as any);

    await service.createReferral(
      "assessment-1",
      "patient-1",
      "user-1",
      "chu-1",
      ModelNames.CommunityHealthUnit,
      "hospital-1",
      undefined,
      session as any,
    );

    expect(Assessment.findById).toHaveBeenCalledWith("assessment-1");
    expect(assessmentQuery.session).toHaveBeenCalledWith(session);
    expect(clinicalQuery.session).toHaveBeenCalledWith(session);
    expect(ClinicalProfile.findOne).toHaveBeenCalledWith({
      userId: "patient-1",
    });
    expect(createSpy).toHaveBeenCalledTimes(1);

    const [referralDocs, createOptions] = createSpy.mock
      .calls[0] as unknown as [any[], { session: unknown }];
    const referralPayload = referralDocs[0];
    const expectedReferralDate = new Date(2026, 2, 10, 14, 30, 0, 0);
    const expectedScheduledVisitDate = new Date(2026, 3, 9, 14, 30, 0, 0);

    expect(createOptions).toEqual({ session });
    expect(referralPayload.userId).toBe("patient-1");
    expect(referralPayload.patientNumber).toBe(1001);
    expect(referralPayload.status).toBe("PENDING");
    expect(referralPayload.assessments).toEqual(["assessment-1"]);
    expect(referralPayload.referredBy).toBe("user-1");
    expect(referralPayload.from).toBe("chu-1");
    expect(referralPayload.fromType).toBe(ModelNames.CommunityHealthUnit);
    expect(referralPayload.to).toBe("hospital-1");
    expect(referralPayload.referralDate).toEqual(expectedReferralDate);
    expect(referralPayload.scheduledVisitDate).toEqual(
      expectedScheduledVisitDate,
    );
  });

  it("throws when the assessment document cannot be found", async () => {
    const assessmentQuery = createSessionLeanExecQuery(null);
    const clinicalQuery = createSessionLeanExecQuery({
      _id: "clinical-profile-1",
      patientNumber: 1001,
    });
    const createSpy = vi.spyOn(Referral, "create");

    vi.spyOn(Assessment, "findById").mockReturnValue(assessmentQuery as any);
    vi.spyOn(ClinicalProfile, "findOne").mockReturnValue(clinicalQuery as any);

    await expect(
      service.createReferral(
        "assessment-1",
        "patient-1",
        "user-1",
        "chu-1",
        ModelNames.CommunityHealthUnit,
        "hospital-1",
        undefined,
        session as any,
      ),
    ).rejects.toThrow("Required Assessment or Clinical Profile not found");

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("throws when the clinical profile cannot be found", async () => {
    const assessmentQuery = createSessionLeanExecQuery({ _id: "assessment-1" });
    const clinicalQuery = createSessionLeanExecQuery(null);
    const createSpy = vi.spyOn(Referral, "create");

    vi.spyOn(Assessment, "findById").mockReturnValue(assessmentQuery as any);
    vi.spyOn(ClinicalProfile, "findOne").mockReturnValue(clinicalQuery as any);

    await expect(
      service.createReferral(
        "assessment-1",
        "patient-1",
        "user-1",
        "chu-1",
        ModelNames.CommunityHealthUnit,
        "hospital-1",
        undefined,
        session as any,
      ),
    ).rejects.toThrow("Required Assessment or Clinical Profile not found");

    expect(createSpy).not.toHaveBeenCalled();
  });
});

// TODO After Implementing the feature
describe.skip("ReferralService.getPendingReferralByPatientNumber", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns pending referral scoped by patient number and session", async () => {
    const service = new ReferralService();
    const referral = { _id: "ref-1", patientNumber: 1001, status: "PENDING" };
    const query = createSessionLeanExecQuery(referral);
    const session = { id: "session-1" };

    vi.spyOn(Referral, "findOne").mockReturnValue(query as any);

    const result = await service.getPendingReferralByPatientNumber(
      1001,
      session as any,
    );

    expect(Referral.findOne).toHaveBeenCalledWith({
      patientNumber: 1001,
      status: "PENDING",
    });
    expect(query.session).toHaveBeenCalledWith(session);
    expect(result).toEqual(referral);
  });
});

//TODO CHECK THIS ONE
describe("ReferralService.getCommingReferralVisitsIn48h", () => {
  const fixedNow = new Date("2026-04-01T10:15:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("queries pending referrals in the next 48 hours and maps response shape", async () => {
    const service = new ReferralService();
    const dbRows = [
      {
        _id: { toString: () => "ref-1" },
        patientNumber: 3001,
        referralDate: new Date("2026-03-30T10:15:00.000Z"),
        scheduledVisitDate: new Date("2026-04-02T08:00:00.000Z"),
        status: "PENDING",
        assessments: ["a-1", "a-2"],
      },
      {
        _id: { toString: () => "ref-2" },
        patientNumber: 3002,
        referralDate: new Date("2026-03-31T10:15:00.000Z"),
        scheduledVisitDate: new Date("2026-04-02T09:00:00.000Z"),
        status: "PENDING",
        assessments: [],
      },
    ];

    const lean = vi.fn().mockResolvedValue(dbRows);
    const sort = vi.fn().mockReturnValue({ lean });
    const findSpy = vi.spyOn(Referral, "find").mockReturnValue({ sort } as any);

    const result = await service.getCommingReferralVisitsIn48h({
      from: "507f1f77bcf86cd799439011",
      fromType: "CommunityHealthUnit",
    });

    expect(findSpy).toHaveBeenCalledTimes(1);
    const calledFilter = findSpy.mock.calls[0]
      ? (findSpy?.mock?.calls[0][0] as any)
      : null;
    expect(calledFilter.from.toString()).toBe("507f1f77bcf86cd799439011");
    expect(calledFilter.fromType).toBe("CommunityHealthUnit");
    expect(calledFilter.status).toBe("PENDING");
    expect(calledFilter.scheduledVisitDate.$gte.toISOString()).toBe(
      fixedNow.toISOString(),
    );
    expect(calledFilter.scheduledVisitDate.$lte.toISOString()).toBe(
      new Date("2026-04-03T10:15:00.000Z").toISOString(),
    );

    expect(sort).toHaveBeenCalledWith({ scheduledVisitDate: 1 });
    expect(result).toEqual([
      {
        id: "ref-1",
        patientNumber: 3001,
        referralDate: dbRows ? dbRows[0]?.referralDate : null,
        scheduledVisitDate: dbRows ? dbRows[0]?.scheduledVisitDate : null,
        status: "PENDING",
        assessmentCount: 2,
      },
      {
        id: "ref-2",
        patientNumber: 3002,
        referralDate: dbRows ? dbRows[1]?.referralDate : null,
        scheduledVisitDate: dbRows ? dbRows[1]?.scheduledVisitDate : null,
        status: "PENDING",
        assessmentCount: 0,
      },
    ]);
  });

  it("uses provided status instead of default pending", async () => {
    const service = new ReferralService();
    const lean = vi.fn().mockResolvedValue([]);
    const sort = vi.fn().mockReturnValue({ lean });
    const findSpy = vi.spyOn(Referral, "find").mockReturnValue({ sort } as any);

    await service.getCommingReferralVisitsIn48h({
      from: "507f1f77bcf86cd799439012",
      fromType: "CommunityHealthUnit",
      status: "COMPLETED",
    });

    const calledFilter = findSpy.mock.calls[0]
      ? (findSpy?.mock?.calls[0][0] as any)
      : null;
    expect(calledFilter.status).toBe("COMPLETED");
  });
});

describe("ReferralService.getReferralMetrics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns metrics computed from the count helpers", async () => {
    const service = new ReferralService();
    vi.spyOn(service, "countTotalReferrals").mockResolvedValue(20);
    vi.spyOn(service, "countPendingReferrals").mockResolvedValue(5);
    vi.spyOn(service, "countScheduledTodayReferrals").mockResolvedValue(3);
    vi.spyOn(service, "countCompletedTodayReferrals").mockResolvedValue(2);
    vi.spyOn(service, "countOverdueReferrals").mockResolvedValue(1);

    const result = await service.getReferralMetrics({
      from: "507f1f77bcf86cd799439011",
      fromType: "CHU",
    });

    expect(result).toEqual({
      total: 20,
      pending: 5,
      scheduled_today: 3,
      completed_today: 2,
      overdue: 1,
    });
  });
});

// TODO After Implementing the feature
describe.skip("ReferralService.getReferralById", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when referral is not found", async () => {
    const service = new ReferralService();
    const exec = vi.fn().mockResolvedValue(null);
    const lean = vi.fn().mockReturnValue({ exec });
    const select = vi.fn().mockReturnValue({ lean });

    vi.spyOn(Referral, "findById").mockReturnValue({ select } as any);

    const result = await service.getReferralById("missing-referral");

    expect(result).toBeNull();
  });

  it("maps referral document to details DTO", async () => {
    const service = new ReferralService();
    const doc = {
      _id: { toString: () => "ref-42" },
      patient: { toString: () => "patient-42" },
      patientNumber: 4242,
      clinicalProfile: { toString: () => "cp-42" },
      hospitalId: { toString: () => "hospital-42" },
      referralDate: new Date("2026-03-10T00:00:00.000Z"),
      scheduledVisitDate: new Date("2026-04-09T00:00:00.000Z"),
      visitDate: new Date("2026-03-20T00:00:00.000Z"),
      status: "COMPLETED",
      assessments: [{ toString: () => "a-1" }, { toString: () => "a-2" }],
      referredBy: { toString: () => "user-42" },
      createdAt: new Date("2026-03-10T01:00:00.000Z"),
      updatedAt: new Date("2026-03-20T01:00:00.000Z"),
    };
    const exec = vi.fn().mockResolvedValue(doc);
    const lean = vi.fn().mockReturnValue({ exec });
    const select = vi.fn().mockReturnValue({ lean });
    const findByIdSpy = vi
      .spyOn(Referral, "findById")
      .mockReturnValue({ select } as any);

    const result = await service.getReferralById("ref-42");

    expect(findByIdSpy).toHaveBeenCalledWith("ref-42");
    expect(select).toHaveBeenCalledWith({
      patient: 1,
      patientNumber: 1,
      clinicalProfile: 1,
      hospitalId: 1,
      referralDate: 1,
      scheduledVisitDate: 1,
      visitDate: 1,
      status: 1,
      assessments: 1,
      referredBy: 1,
      createdAt: 1,
      updatedAt: 1,
    });
    expect(result).toEqual({
      id: "ref-42",
      patient: "patient-42",
      patientNumber: 4242,
      clinicalProfile: "cp-42",
      hospitalId: "hospital-42",
      referralDate: doc.referralDate,
      scheduledVisitDate: doc.scheduledVisitDate,
      status: "COMPLETED",
      assessments: ["a-1", "a-2"],
      referredBy: "user-42",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      visitDate: doc.visitDate,
    });
  });
});
