import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import mongoose from 'mongoose';

import ClinicalProfile from '../../models/clinicalProfile.model.js';
import Indicator from '../../models/indicator.model.js';
import { Assessment } from '../../models/assessment.model.js';
import { AssessmentCreationError } from '../../Errors/AssessmentCreationError.js';
import HasPendingReferralError from '../../Errors/HasPendingReferralError.js';
import IndicatorNotFound from '../../Errors/IndicatorNotFoundError.js';
import InvalidUnit from '../../Errors/InvalidUnits.js';
import PatientNotFoundException from '../../Errors/PatientNotFoundException.js';
import AssessmentClassifier from '../../service/assessment-classifier.service.js';
import AssessmentService from '../../service/assessment.service.js';

function createSessionMock() {
  return {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    abortTransaction: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn(),
  };
}

function createSessionAwareLeanQuery<T>(result: T) {
  return {
    session: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnValue(result),
  };
}

describe('AssessmentService.createAssessment', () => {
  const diabetesDto = {
    patientNumber: 1001,
    indicator: 'indicator-diabetes',
    readings: {
      random_blood_glucose: {
        value: 139,
        unit: 'mg/dL',
      },
    },
  };

  const hypertensionDto = {
    patientNumber: 2001,
    indicator: 'indicator-hypertension',
    readings: {
      systolic_blood_pressure: {
        value: 180,
        unit: 'mmHg',
      },
      diastolic_blood_pressure: {
        value: 120,
        unit: 'mmHg',
      },
    },
  };

  let session: ReturnType<typeof createSessionMock>;
  let referralService: {
    createReferral: ReturnType<typeof vi.fn>;
    getPendingReferralByPatientNumber: ReturnType<typeof vi.fn>;
  };
  let service: AssessmentService;

  beforeEach(() => {
    session = createSessionMock();
    referralService = {
      createReferral: vi.fn().mockResolvedValue(undefined),
      getPendingReferralByPatientNumber: vi.fn().mockResolvedValue(null),
    };
    service = new AssessmentService(referralService as any);

    vi.spyOn(mongoose, 'startSession').mockResolvedValue(session as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a healthy diabetes assessment and commits without creating a referral', async () => {
    const indicatorDoc = {
      name: 'diabetes',
      readings: [{ type: 'random_blood_glucose', unit: 'mg/dL' }],
      classifications: [],
    };
    const clinicalProfile = {
      userId: 'patient-1',
    };
    const classificationResult = {
      classification: {
        label: 'Normal',
        status_code: 'healthy' as const,
      },
      recommendations: ['Komeza kurya indyo yuzuye'],
    };
    const createdAssessment = {
      id: 'assessment-1',
      readings: diabetesDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    };

    const indicatorQuery = createSessionAwareLeanQuery(indicatorDoc);
    const clinicalQuery = createSessionAwareLeanQuery(clinicalProfile);

    vi.spyOn(Indicator, 'findById').mockReturnValue(indicatorQuery as any);
    vi.spyOn(ClinicalProfile, 'findOne').mockReturnValue(clinicalQuery as any);
    vi.spyOn(service as any, 'indicatorAssessmentExistsForPendingReferral').mockResolvedValue(false);
    vi.spyOn(AssessmentClassifier.prototype, 'classifyDiabetes').mockReturnValue(classificationResult);
    const createSpy = vi.spyOn(Assessment, 'create').mockResolvedValue([createdAssessment] as any);

    const result = await service.createAssessment(diabetesDto as any, 'evaluator-1');

    expect(Indicator.findById).toHaveBeenCalledWith(diabetesDto.indicator);
    expect(indicatorQuery.session).toHaveBeenCalledWith(session);
    expect(clinicalQuery.session).toHaveBeenCalledWith(session);
    expect(AssessmentClassifier.prototype.classifyDiabetes).toHaveBeenCalledWith(diabetesDto.readings, indicatorDoc);
    expect(createSpy).toHaveBeenCalledTimes(1);

    const [assessmentDocs, createOptions] = createSpy.mock.calls[0] as unknown as [any[], { session: unknown }];
    const assessmentPayload = assessmentDocs[0];

    expect(createOptions).toEqual({ session });
    expect(assessmentPayload.patient).toBe('patient-1');
    expect(assessmentPayload.indicator).toBe(diabetesDto.indicator);
    expect(assessmentPayload.evaluatedBy).toBe('evaluator-1');
    expect(assessmentPayload.readings).toEqual(diabetesDto.readings);
    expect(assessmentPayload.classification).toEqual(classificationResult.classification);
    expect(assessmentPayload.recommendations).toEqual(classificationResult.recommendations);
    expect(assessmentPayload.evaluatedAt).toBeInstanceOf(Date);
    expect(assessmentPayload.evaluatedDate).toBeInstanceOf(Date);
    expect(assessmentPayload.evaluatedDate.getHours()).toBe(0);
    expect(assessmentPayload.evaluatedDate.getMinutes()).toBe(0);
    expect(assessmentPayload.evaluatedDate.getSeconds()).toBe(0);
    expect(assessmentPayload.evaluatedDate.getMilliseconds()).toBe(0);

    expect(referralService.createReferral).not.toHaveBeenCalled();
    expect(session.startTransaction).toHaveBeenCalledOnce();
    expect(session.commitTransaction).toHaveBeenCalledOnce();
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledOnce();
    expect(result).toEqual(createdAssessment);
  });

  it('creates a referral for an abnormal hypertension assessment', async () => {
    const indicatorDoc = {
      name: 'hypertension',
      readings: [
        { type: 'systolic_blood_pressure', unit: 'mmHg' },
        { type: 'diastolic_blood_pressure', unit: 'mmHg' },
      ],
      classifications: [],
    };
    const clinicalProfile = {
      userId: {
        toString: () => 'patient-2',
      },
    };
    const classificationResult = {
      classification: {
        label: 'Hypertensive Crisis',
        status_code: 'critical' as const,
      },
      recommendations: ['Gana ivuriro ryihuse bitarenze uyu munsi'],
    };
    const createdAssessment = {
      id: 'assessment-2',
      readings: hypertensionDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    };

    vi.spyOn(Indicator, 'findById').mockReturnValue(createSessionAwareLeanQuery(indicatorDoc) as any);
    vi.spyOn(ClinicalProfile, 'findOne').mockReturnValue(createSessionAwareLeanQuery(clinicalProfile) as any);
    vi.spyOn(service as any, 'indicatorAssessmentExistsForPendingReferral').mockResolvedValue(false);
    vi.spyOn(AssessmentClassifier.prototype, 'classifyHypertension').mockReturnValue(classificationResult);
    vi.spyOn(Assessment, 'create').mockResolvedValue([createdAssessment] as any);

    const result = await service.createAssessment(hypertensionDto as any, 'evaluator-2');

    expect(AssessmentClassifier.prototype.classifyHypertension).toHaveBeenCalledWith(
      hypertensionDto.readings,
      indicatorDoc,
    );
    expect(referralService.createReferral).toHaveBeenCalledWith('assessment-2', 'patient-2', 'evaluator-2', session);
    expect(session.commitTransaction).toHaveBeenCalledOnce();
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(result).toEqual(createdAssessment);
  });

  it('throws IndicatorNotFound when the indicator does not exist', async () => {
    vi.spyOn(Indicator, 'findById').mockReturnValue(createSessionAwareLeanQuery(null) as any);
    const assessmentCreateSpy = vi.spyOn(Assessment, 'create');

    await expect(service.createAssessment(diabetesDto as any, 'evaluator-1')).rejects.toBeInstanceOf(IndicatorNotFound);

    expect(assessmentCreateSpy).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it('throws HasPendingReferralError when the patient already has the same indicator in a pending referral', async () => {
    const indicatorDoc = {
      name: 'diabetes',
      readings: [{ type: 'random_blood_glucose', unit: 'mg/dL' }],
      classifications: [],
    };

    vi.spyOn(Indicator, 'findById').mockReturnValue(createSessionAwareLeanQuery(indicatorDoc) as any);
    vi.spyOn(service as any, 'indicatorAssessmentExistsForPendingReferral').mockResolvedValue(true);
    const clinicalFindSpy = vi.spyOn(ClinicalProfile, 'findOne');

    await expect(service.createAssessment(diabetesDto as any, 'evaluator-1')).rejects.toBeInstanceOf(
      HasPendingReferralError,
    );

    expect(clinicalFindSpy).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it('throws PatientNotFoundException when the patient clinical profile does not exist', async () => {
    const indicatorDoc = {
      name: 'diabetes',
      readings: [{ type: 'random_blood_glucose', unit: 'mg/dL' }],
      classifications: [],
    };

    vi.spyOn(Indicator, 'findById').mockReturnValue(createSessionAwareLeanQuery(indicatorDoc) as any);
    vi.spyOn(ClinicalProfile, 'findOne').mockReturnValue(createSessionAwareLeanQuery(null) as any);
    vi.spyOn(service as any, 'indicatorAssessmentExistsForPendingReferral').mockResolvedValue(false);
    const createSpy = vi.spyOn(Assessment, 'create');

    await expect(service.createAssessment(diabetesDto as any, 'evaluator-1')).rejects.toBeInstanceOf(
      PatientNotFoundException,
    );

    expect(createSpy).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it('throws InvalidUnit when submitted units do not match indicator configuration', async () => {
    const indicatorDoc = {
      name: 'diabetes',
      readings: [{ type: 'random_blood_glucose', unit: 'mg/dL' }],
      classifications: [],
    };
    const clinicalProfile = {
      userId: 'patient-1',
    };
    const dtoWithWrongUnit = {
      ...diabetesDto,
      readings: {
        random_blood_glucose: {
          value: 139,
          unit: 'mmol/L',
        },
      },
    };

    vi.spyOn(Indicator, 'findById').mockReturnValue(createSessionAwareLeanQuery(indicatorDoc) as any);
    vi.spyOn(ClinicalProfile, 'findOne').mockReturnValue(createSessionAwareLeanQuery(clinicalProfile) as any);
    vi.spyOn(service as any, 'indicatorAssessmentExistsForPendingReferral').mockResolvedValue(false);
    const classifySpy = vi.spyOn(AssessmentClassifier.prototype, 'classifyDiabetes');
    const createSpy = vi.spyOn(Assessment, 'create');

    let thrownError: unknown;

    try {
      await service.createAssessment(dtoWithWrongUnit as any, 'evaluator-1');
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(InvalidUnit);
    expect(thrownError).toMatchObject({
      message: 'Reading unit mismatch: random_blood_glucose expects unit mg/dL but got mmol/L',
    });

    expect(classifySpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
  });

  it('throws AssessmentCreationError when Assessment.create does not return a created document', async () => {
    const indicatorDoc = {
      name: 'diabetes',
      readings: [{ type: 'random_blood_glucose', unit: 'mg/dL' }],
      classifications: [],
    };
    const clinicalProfile = {
      userId: 'patient-1',
    };
    const classificationResult = {
      classification: {
        label: 'Normal',
        status_code: 'healthy' as const,
      },
      recommendations: ['Komeza kurya indyo yuzuye'],
    };

    vi.spyOn(Indicator, 'findById').mockReturnValue(createSessionAwareLeanQuery(indicatorDoc) as any);
    vi.spyOn(ClinicalProfile, 'findOne').mockReturnValue(createSessionAwareLeanQuery(clinicalProfile) as any);
    vi.spyOn(service as any, 'indicatorAssessmentExistsForPendingReferral').mockResolvedValue(false);
    vi.spyOn(AssessmentClassifier.prototype, 'classifyDiabetes').mockReturnValue(classificationResult);
    vi.spyOn(Assessment, 'create').mockResolvedValue([] as any);

    await expect(service.createAssessment(diabetesDto as any, 'evaluator-1')).rejects.toBeInstanceOf(
      AssessmentCreationError,
    );

    expect(referralService.createReferral).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });
});