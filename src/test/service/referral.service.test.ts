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

    await service.createReferral('assessment-new', 'patient-1', 'user-1', session as any);

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

    await service.createReferral('assessment-existing', 'patient-1', 'user-1', session as any);

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

    await expect(service.createReferral('assessment-new', 'patient-1', 'user-1', session as any)).rejects.toBeInstanceOf(
      HasPendingReferralError,
    );

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

    await service.createReferral('assessment-1', 'patient-1', 'user-1', session as any);

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

    await expect(service.createReferral('assessment-1', 'patient-1', 'user-1', session as any)).rejects.toThrow(
      'Required Assessment or Clinical Profile not found',
    );

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

    await expect(service.createReferral('assessment-1', 'patient-1', 'user-1', session as any)).rejects.toThrow(
      'Required Assessment or Clinical Profile not found',
    );

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