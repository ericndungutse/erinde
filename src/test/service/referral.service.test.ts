import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ClinicalProfile from '../../models/clinicalProfile.model.js';
import { Assessment } from '../../models/assessment.model.js';
import HasPendingReferralError from '../../Errors/HasPendingReferralError.js';
import Referral from '../../models/referral.model.js';
import ReferralService from '../../service/referral.service.js';

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

describe('ReferralService.createReferral', () => {
  const fixedNow = new Date(2026, 2, 10, 14, 30, 0, 0);
  const session = { id: 'session-1' };
  let service: ReferralService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    service = new ReferralService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('appends an assessment to an existing same-day pending referral and saves it', async () => {
    const existingReferral = {
      referralDate: new Date(2026, 2, 10, 8, 0, 0, 0),
      assessments: ['assessment-old'],
      save: vi.fn().mockResolvedValue(undefined),
    };
    const findOneQuery = createSessionExecQuery(existingReferral);
    const createSpy = vi.spyOn(Referral, 'create');

    vi.spyOn(Referral, 'findOne').mockReturnValue(findOneQuery as any);

    await service.createReferral('assessment-new', 'patient-1', 'hospital-1', 'user-1', session as any);

    expect(Referral.findOne).toHaveBeenCalledWith({
      patient: 'patient-1',
      status: 'PENDING',
    });
    expect(findOneQuery.session).toHaveBeenCalledWith(session);
    expect(existingReferral.assessments).toEqual(['assessment-old', 'assessment-new']);
    expect(existingReferral.save).toHaveBeenCalledWith({ session });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('does not save when the existing referral already contains the assessment id', async () => {
    const existingReferral = {
      referralDate: new Date(2026, 2, 10, 9, 0, 0, 0),
      assessments: ['assessment-existing'],
      save: vi.fn().mockResolvedValue(undefined),
    };
    const findOneQuery = createSessionExecQuery(existingReferral);
    const createSpy = vi.spyOn(Referral, 'create');

    vi.spyOn(Referral, 'findOne').mockReturnValue(findOneQuery as any);

    await service.createReferral('assessment-existing', 'patient-1', 'hospital-1', 'user-1', session as any);

    expect(existingReferral.assessments).toEqual(['assessment-existing']);
    expect(existingReferral.save).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('throws HasPendingReferralError when a pending referral exists for a different day', async () => {
    const existingReferral = {
      referralDate: new Date(2026, 2, 9, 12, 0, 0, 0),
      assessments: ['assessment-old'],
      save: vi.fn().mockResolvedValue(undefined),
    };
    const findOneQuery = createSessionExecQuery(existingReferral);

    vi.spyOn(Referral, 'findOne').mockReturnValue(findOneQuery as any);

    await expect(
      service.createReferral('assessment-new', 'patient-1', 'hospital-1', 'user-1', session as any),
    ).rejects.toBeInstanceOf(HasPendingReferralError);

    expect(existingReferral.save).not.toHaveBeenCalled();
  });

  it('creates a new referral when there is no existing pending referral', async () => {
    const assessmentDoc = { _id: 'assessment-1' };
    const clinicalProfile = {
      _id: 'clinical-profile-1',
      patientNumber: 1001,
    };
    const findOneQuery = createSessionExecQuery(null);
    const assessmentQuery = createSessionLeanExecQuery(assessmentDoc);
    const clinicalQuery = createSessionLeanExecQuery(clinicalProfile);
    const createSpy = vi.spyOn(Referral, 'create').mockResolvedValue([] as any);

    vi.spyOn(Referral, 'findOne').mockReturnValue(findOneQuery as any);
    vi.spyOn(Assessment, 'findById').mockReturnValue(assessmentQuery as any);
    vi.spyOn(ClinicalProfile, 'findOne').mockReturnValue(clinicalQuery as any);

    await service.createReferral('assessment-1', 'patient-1', 'hospital-1', 'user-1', session as any);

    expect(Assessment.findById).toHaveBeenCalledWith('assessment-1');
    expect(assessmentQuery.session).toHaveBeenCalledWith(session);
    expect(clinicalQuery.session).toHaveBeenCalledWith(session);
    expect(ClinicalProfile.findOne).toHaveBeenCalledWith({ userId: 'patient-1' });
    expect(createSpy).toHaveBeenCalledTimes(1);

    const [referralDocs, createOptions] = createSpy.mock.calls[0] as unknown as [any[], { session: unknown }];
    const referralPayload = referralDocs[0];
    const expectedReferralDate = new Date(2026, 2, 10, 0, 0, 0, 0);
    const expectedScheduledVisitDate = new Date(2026, 3, 9, 0, 0, 0, 0);

    expect(createOptions).toEqual({ session });
    expect(referralPayload.patient).toBe('patient-1');
    expect(referralPayload.patientNumber).toBe(1001);
    expect(referralPayload.clinicalProfile).toBe('clinical-profile-1');
    expect(referralPayload.status).toBe('PENDING');
    expect(referralPayload.assessments).toEqual(['assessment-1']);
    expect(referralPayload.referredBy).toBe('user-1');
    expect(referralPayload.hospitalId).toBe('hospital-1');
    expect(referralPayload.referralDate).toEqual(expectedReferralDate);
    expect(referralPayload.scheduledVisitDate).toEqual(expectedScheduledVisitDate);
  });

  it('throws when the assessment document cannot be found', async () => {
    const findOneQuery = createSessionExecQuery(null);
    const assessmentQuery = createSessionLeanExecQuery(null);
    const clinicalQuery = createSessionLeanExecQuery({ _id: 'clinical-profile-1', patientNumber: 1001 });
    const createSpy = vi.spyOn(Referral, 'create');

    vi.spyOn(Referral, 'findOne').mockReturnValue(findOneQuery as any);
    vi.spyOn(Assessment, 'findById').mockReturnValue(assessmentQuery as any);
    vi.spyOn(ClinicalProfile, 'findOne').mockReturnValue(clinicalQuery as any);

    await expect(
      service.createReferral('assessment-1', 'patient-1', 'hospital-1', 'user-1', session as any),
    ).rejects.toThrow('Required Assessment or Clinical Profile not found');

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('throws when the clinical profile cannot be found', async () => {
    const findOneQuery = createSessionExecQuery(null);
    const assessmentQuery = createSessionLeanExecQuery({ _id: 'assessment-1' });
    const clinicalQuery = createSessionLeanExecQuery(null);
    const createSpy = vi.spyOn(Referral, 'create');

    vi.spyOn(Referral, 'findOne').mockReturnValue(findOneQuery as any);
    vi.spyOn(Assessment, 'findById').mockReturnValue(assessmentQuery as any);
    vi.spyOn(ClinicalProfile, 'findOne').mockReturnValue(clinicalQuery as any);

    await expect(
      service.createReferral('assessment-1', 'patient-1', 'hospital-1', 'user-1', session as any),
    ).rejects.toThrow('Required Assessment or Clinical Profile not found');

    expect(createSpy).not.toHaveBeenCalled();
  });
});

describe('ReferralService.isSameDay', () => {
  let service: ReferralService;

  beforeEach(() => {
    service = new ReferralService();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true for dates on the same calendar day', () => {
    const result = service.isSameDay(new Date(2026, 2, 10, 8, 0, 0, 0), new Date(2026, 2, 10, 22, 15, 0, 0));

    expect(result).toBe(true);
  });

  it('returns false for dates on different calendar days', () => {
    const result = service.isSameDay(new Date(2026, 2, 10, 23, 59, 0, 0), new Date(2026, 2, 11, 0, 1, 0, 0));

    expect(result).toBe(false);
  });
});

describe('ReferralService.getPendingReferralByPatientNumber', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns pending referral scoped by patient number and session', async () => {
    const service = new ReferralService();
    const referral = { _id: 'ref-1', patientNumber: 1001, status: 'PENDING' };
    const query = createSessionLeanExecQuery(referral);
    const session = { id: 'session-1' };

    vi.spyOn(Referral, 'findOne').mockReturnValue(query as any);

    const result = await service.getPendingReferralByPatientNumber(1001, session as any);

    expect(Referral.findOne).toHaveBeenCalledWith({ patientNumber: 1001, status: 'PENDING' });
    expect(query.session).toHaveBeenCalledWith(session);
    expect(result).toEqual(referral);
  });
});

describe('ReferralService.hasPendingReferral', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when a pending referral exists', async () => {
    const service = new ReferralService();
    vi.spyOn(Referral, 'exists').mockResolvedValue({ _id: 'ref-1' } as any);

    const result = await service.hasPendingReferral(1002);

    expect(Referral.exists).toHaveBeenCalledWith({ patientNumber: 1002, status: 'PENDING' });
    expect(result).toBe(true);
  });

  it('returns false when no pending referral exists', async () => {
    const service = new ReferralService();
    vi.spyOn(Referral, 'exists').mockResolvedValue(null);

    const result = await service.hasPendingReferral(1003);

    expect(result).toBe(false);
  });
});

describe('ReferralService.completeReferralByPatientNumber', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('marks latest pending referral as completed and returns updated referral', async () => {
    const service = new ReferralService();
    const updated = { _id: 'ref-2', status: 'COMPLETED' };
    const exec = vi.fn().mockResolvedValue(updated);
    const populate = vi.fn().mockReturnValue({ exec });
    const findOneAndUpdateSpy = vi.spyOn(Referral, 'findOneAndUpdate').mockReturnValue({ populate } as any);

    const result = await service.completeReferralByPatientNumber(1004);

    expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
      { patientNumber: 1004, status: 'PENDING' },
      {
        $set: {
          status: 'COMPLETED',
          visitDate: expect.any(Date),
        },
      },
      {
        new: true,
        sort: { createdAt: -1 },
      },
    );
    expect(populate).toHaveBeenCalledWith('patient');
    expect(result).toEqual(updated);
  });

  it('returns null when no pending referral matches the patient number', async () => {
    const service = new ReferralService();
    const exec = vi.fn().mockResolvedValue(null);
    const populate = vi.fn().mockReturnValue({ exec });

    vi.spyOn(Referral, 'findOneAndUpdate').mockReturnValue({ populate } as any);

    const result = await service.completeReferralByPatientNumber(9999);

    expect(result).toBeNull();
  });
});

describe('ReferralService.listReferralsByHealthWorker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns referral summaries with pagination metadata', async () => {
    const service = new ReferralService();
    const countExec = vi.fn().mockResolvedValue([{ count: 11 }]);
    const aggregateResults = [
      {
        _id: { toString: () => 'ref-10' },
        patientNumber: 2001,
        referralDate: new Date('2026-03-10T00:00:00.000Z'),
        scheduledVisitDate: new Date('2026-04-09T00:00:00.000Z'),
        status: 'PENDING',
        assessmentCount: 2,
      },
    ];
    const resultsExec = vi.fn().mockResolvedValue(aggregateResults);
    const aggregateSpy = vi
      .spyOn(Referral, 'aggregate')
      .mockReturnValueOnce({ exec: countExec } as any)
      .mockReturnValueOnce({ exec: resultsExec } as any);

    const result = await service.listReferralsByHealthWorker('507f1f77bcf86cd799439011', 'PENDING', {
      page: '2',
      limit: '10',
    });

    expect(aggregateSpy).toHaveBeenCalledTimes(2);

    const countPipeline = aggregateSpy.mock.calls[0]![0] as any[];
    expect(countPipeline.some((stage) => stage.$lookup?.from === 'clinicalprofiles')).toBe(true);
    expect(countPipeline.some((stage) => stage.$match?.status === 'PENDING')).toBe(true);
    expect(countPipeline.some((stage) => stage.$count === 'count')).toBe(true);

    const resultsPipeline = aggregateSpy.mock.calls[1]![0] as any[];
    expect(resultsPipeline.some((stage) => stage.$sort?.createdAt === -1)).toBe(true);
    expect(resultsPipeline.some((stage) => stage.$skip === 10)).toBe(true);
    expect(resultsPipeline.some((stage) => stage.$limit === 10)).toBe(true);

    const [firstResult] = aggregateResults;
    expect(result).toEqual({
      referrals: [
        {
          id: 'ref-10',
          patientNumber: 2001,
          referralDate: firstResult!.referralDate,
          scheduledVisitDate: firstResult!.scheduledVisitDate,
          status: 'PENDING',
          assessmentCount: 2,
        },
      ],
      pagination: {
        currentPage: 2,
        perPage: 10,
        totalResults: 11,
        totalPages: 2,
        hasNextPage: false,
        hasPrevPage: true,
        nextPage: null,
        prevPage: 1,
      },
    });
  });
});

describe('ReferralService.listReferralsByHospital', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns referral summaries with pagination metadata for nurse hospital view', async () => {
    const service = new ReferralService();
    const countExec = vi.fn().mockResolvedValue(11);
    const countDocumentsSpy = vi.spyOn(Referral, 'countDocuments').mockReturnValue({ exec: countExec } as any);

    const findResults = [
      {
        _id: { toString: () => 'ref-hosp-10' },
        patientNumber: 4001,
        referralDate: new Date('2026-03-10T00:00:00.000Z'),
        scheduledVisitDate: new Date('2026-04-09T00:00:00.000Z'),
        status: 'PENDING',
        assessments: ['assessment-1', 'assessment-2'],
      },
    ];
    const findExec = vi.fn().mockResolvedValue(findResults);
    const findQuery = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: findExec,
    };
    const findSpy = vi.spyOn(Referral, 'find').mockReturnValue(findQuery as any);

    const result = await service.listReferralsByHospital('507f1f77bcf86cd799439017', {
      page: '2',
      limit: '10',
    });

    expect(countDocumentsSpy).toHaveBeenCalledTimes(1);
    const countFilter = countDocumentsSpy.mock.calls[0]![0] as { hospitalId: { toString: () => string } };
    expect(countFilter.hospitalId.toString()).toBe('507f1f77bcf86cd799439017');

    expect(findSpy).toHaveBeenCalledTimes(1);
    const findFilter = findSpy.mock.calls[0]![0] as { hospitalId: { toString: () => string } };
    expect(findFilter.hospitalId.toString()).toBe('507f1f77bcf86cd799439017');
    expect(findQuery.skip).toHaveBeenCalledWith(10);
    expect(findQuery.limit).toHaveBeenCalledWith(10);

    const [firstResult] = findResults;
    expect(result).toEqual({
      referrals: [
        {
          id: 'ref-hosp-10',
          patientNumber: 4001,
          referralDate: firstResult!.referralDate,
          scheduledVisitDate: firstResult!.scheduledVisitDate,
          status: 'PENDING',
          assessmentCount: 2,
        },
      ],
      pagination: {
        currentPage: 2,
        perPage: 10,
        totalResults: 11,
        totalPages: 2,
        hasNextPage: false,
        hasPrevPage: true,
        nextPage: null,
        prevPage: 1,
      },
    });
  });
});

describe('ReferralService.listUpcomingReferralsByHealthWorker', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('filters upcoming pending referrals within 48 hours and maps summaries', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T08:00:00.000Z'));

    const service = new ReferralService();
    const aggregateResults = [
      {
        _id: { toString: () => 'ref-upcoming-1' },
        patientNumber: 3001,
        referralDate: new Date('2026-03-10T00:00:00.000Z'),
        scheduledVisitDate: new Date('2026-03-11T07:00:00.000Z'),
        status: 'PENDING',
        assessmentCount: 1,
      },
    ];
    const exec = vi.fn().mockResolvedValue(aggregateResults);
    const aggregateSpy = vi.spyOn(Referral, 'aggregate').mockReturnValue({ exec } as any);

    const result = await service.listUpcomingReferralsByHealthWorker('507f1f77bcf86cd799439012');

    const [firstCall] = aggregateSpy.mock.calls;
    const pipeline = firstCall![0] as any[];
    const matchStage = pipeline.find((stage) => stage.$match)?.$match;
    expect(matchStage.status).toBe('PENDING');
    expect(matchStage.scheduledVisitDate.$gte).toBeInstanceOf(Date);
    expect(matchStage.scheduledVisitDate.$lte).toBeInstanceOf(Date);
    expect(matchStage.scheduledVisitDate.$lte.getTime() - matchStage.scheduledVisitDate.$gte.getTime()).toBe(
      48 * 60 * 60 * 1000,
    );
    expect(pipeline.some((stage) => stage.$limit === 5)).toBe(true);

    const [firstResult] = aggregateResults;
    expect(result).toEqual([
      {
        id: 'ref-upcoming-1',
        patientNumber: 3001,
        referralDate: firstResult!.referralDate,
        scheduledVisitDate: firstResult!.scheduledVisitDate,
        status: 'PENDING',
        assessmentCount: 1,
      },
    ]);
  });
});

describe('ReferralService.countPendingReferralsByHealthWorker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns aggregate count when present', async () => {
    const service = new ReferralService();
    vi.spyOn(Referral, 'aggregate').mockReturnValue({ exec: vi.fn().mockResolvedValue([{ count: 6 }]) } as any);

    const result = await service.countPendingReferralsByHealthWorker('507f1f77bcf86cd799439013');

    expect(result).toBe(6);
  });

  it('returns 0 when aggregate returns no rows', async () => {
    const service = new ReferralService();
    vi.spyOn(Referral, 'aggregate').mockReturnValue({ exec: vi.fn().mockResolvedValue([]) } as any);

    const result = await service.countPendingReferralsByHealthWorker('507f1f77bcf86cd799439014');

    expect(result).toBe(0);
  });
});

describe('ReferralService.getReferralStatusOverviewByHealthWorker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns computed summary from aggregate facets', async () => {
    const service = new ReferralService();
    vi.spyOn(Referral, 'aggregate').mockReturnValue({
      exec: vi.fn().mockResolvedValue([
        {
          pending: [{ count: 3 }],
          completed_this_month: [{ count: 9 }],
          overdue: [{ count: 1 }],
        },
      ]),
    } as any);

    const result = await service.getReferralStatusOverviewByHealthWorker('507f1f77bcf86cd799439015');

    expect(result).toEqual({
      pending: 3,
      completed_this_month: 9,
      overdue: 1,
    });
  });

  it('defaults all counters to zero when aggregate has no rows', async () => {
    const service = new ReferralService();
    vi.spyOn(Referral, 'aggregate').mockReturnValue({ exec: vi.fn().mockResolvedValue([]) } as any);

    const result = await service.getReferralStatusOverviewByHealthWorker('507f1f77bcf86cd799439016');

    expect(result).toEqual({
      pending: 0,
      completed_this_month: 0,
      overdue: 0,
    });
  });
});

describe('ReferralService.getReferralById', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when referral is not found', async () => {
    const service = new ReferralService();
    const exec = vi.fn().mockResolvedValue(null);
    const lean = vi.fn().mockReturnValue({ exec });
    const select = vi.fn().mockReturnValue({ lean });

    vi.spyOn(Referral, 'findById').mockReturnValue({ select } as any);

    const result = await service.getReferralById('missing-referral');

    expect(result).toBeNull();
  });

  it('maps referral document to details DTO', async () => {
    const service = new ReferralService();
    const doc = {
      _id: { toString: () => 'ref-42' },
      patient: { toString: () => 'patient-42' },
      patientNumber: 4242,
      clinicalProfile: { toString: () => 'cp-42' },
      hospitalId: { toString: () => 'hospital-42' },
      referralDate: new Date('2026-03-10T00:00:00.000Z'),
      scheduledVisitDate: new Date('2026-04-09T00:00:00.000Z'),
      visitDate: new Date('2026-03-20T00:00:00.000Z'),
      status: 'COMPLETED',
      assessments: [{ toString: () => 'a-1' }, { toString: () => 'a-2' }],
      referredBy: { toString: () => 'user-42' },
      createdAt: new Date('2026-03-10T01:00:00.000Z'),
      updatedAt: new Date('2026-03-20T01:00:00.000Z'),
    };
    const exec = vi.fn().mockResolvedValue(doc);
    const lean = vi.fn().mockReturnValue({ exec });
    const select = vi.fn().mockReturnValue({ lean });
    const findByIdSpy = vi.spyOn(Referral, 'findById').mockReturnValue({ select } as any);

    const result = await service.getReferralById('ref-42');

    expect(findByIdSpy).toHaveBeenCalledWith('ref-42');
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
      id: 'ref-42',
      patient: 'patient-42',
      patientNumber: 4242,
      clinicalProfile: 'cp-42',
      hospitalId: 'hospital-42',
      referralDate: doc.referralDate,
      scheduledVisitDate: doc.scheduledVisitDate,
      status: 'COMPLETED',
      assessments: ['a-1', 'a-2'],
      referredBy: 'user-42',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      visitDate: doc.visitDate,
    });
  });
});
