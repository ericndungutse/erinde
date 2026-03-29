import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import mongoose from 'mongoose';

import Indicator from '../../models/indicator.model.js';
import { Assessment } from '../../models/assessment.model.js';
import { AssessmentCreationError } from '../../Errors/AssessmentCreationError.js';
import IndicatorNotFound from '../../Errors/IndicatorNotFoundError.js';
import InvalidUnit from '../../Errors/InvalidUnits.js';
import PatientNotFoundException from '../../Errors/PatientNotFoundException.js';
import { ModelNames } from '../../constants/constant.values.js';
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

describe('AssessmentService.createAssessment', () => {
  const diabetesDto = {
    patientNumber: 1001,
    indicator: 'indicator-diabetes',
    takenFrom: 'chu-1',
    takenFromType: ModelNames.CommunityHealthUnit,
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
    takenFrom: 'chu-1',
    takenFromType: ModelNames.CommunityHealthUnit,
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
  };
  let userService: {
    findUserByPatientNumber: ReturnType<typeof vi.fn>;
  };
  let service: AssessmentService;

  beforeEach(() => {
    session = createSessionMock();

    referralService = {
      createReferral: vi.fn().mockResolvedValue(undefined),
    };

    userService = {
      findUserByPatientNumber: vi
        .fn()
        .mockResolvedValue({ id: 'patient-1', district: 'Kigali', communityHealthUnit: 'hospital-1' }),
    };

    service = new AssessmentService(referralService as any, userService as any);

    vi.spyOn(mongoose, 'startSession').mockResolvedValue(session as any);
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
    base: { takenFrom: string; takenFromType: ModelNames; patientNumber: number },
    fields: Pick<CreatedAssessmentDoc, 'id' | 'readings' | 'classification' | 'recommendations'>,
  ): CreatedAssessmentDoc {
    return {
      takenFrom: base.takenFrom,
      takenFromType: base.takenFromType,
      patientNumber: base.patientNumber,
      ...fields,
    };
  }

  it('creates a healthy diabetes assessment and commits without creating a referral', async () => {
    const indicatorDoc = {
      name: 'diabetes',
      readings: [{ type: 'random_blood_glucose', unit: 'mg/dL' }],
      classifications: [],
    };
    const classificationResult = {
      classification: {
        label: 'Normal',
        status_code: 'healthy' as const,
      },
      recommendations: ['Komeza kurya indyo yuzuye'],
    };
    const createdAssessment = createdAssessmentMock(diabetesDto, {
      id: 'assessment-1',
      readings: diabetesDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    });

    const indicatorQuery = createIndicatorLeanQuery(indicatorDoc);

    vi.spyOn(Indicator, 'findById').mockReturnValue(indicatorQuery as any);
    vi.spyOn(AssessmentClassifier.prototype, 'classifyDiabetes').mockReturnValue(classificationResult);
    const createSpy = vi.spyOn(Assessment, 'create').mockResolvedValue([createdAssessment] as any);

    const result = await service.createAssessment(diabetesDto as any, 'evaluator-1');

    expect(Indicator.findById).toHaveBeenCalledWith(diabetesDto.indicator);
    expect(userService.findUserByPatientNumber).toHaveBeenCalledWith(diabetesDto.patientNumber, session);
    expect(AssessmentClassifier.prototype.classifyDiabetes).toHaveBeenCalledWith(diabetesDto.readings, indicatorDoc);
    expect(createSpy).toHaveBeenCalledTimes(1);

    const [assessmentDocs, createOptions] = createSpy.mock.calls[0] as unknown as [any[], { session: unknown }];
    const assessmentPayload = assessmentDocs[0];

    expect(createOptions).toEqual({ session });
    expect(assessmentPayload.patient).toBe('patient-1');
    expect(assessmentPayload.patientNumber).toBe(diabetesDto.patientNumber);
    expect(assessmentPayload.indicator).toBe(diabetesDto.indicator);
    expect(assessmentPayload.evaluatedBy).toBe('evaluator-1');
    expect(assessmentPayload.readings).toEqual(diabetesDto.readings);
    expect(assessmentPayload.takenFrom).toBe(diabetesDto.takenFrom);
    expect(assessmentPayload.takenFromType).toBe(diabetesDto.takenFromType);
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

  it('creates a referral for an abnormal hypertension assessment', async () => {
    const indicatorDoc = {
      name: 'hypertension',
      readings: [
        { type: 'systolic_blood_pressure', unit: 'mmHg' },
        { type: 'diastolic_blood_pressure', unit: 'mmHg' },
      ],
      classifications: [],
    };
    const classificationResult = {
      classification: {
        label: 'Hypertensive Crisis',
        status_code: 'critical' as const,
      },
      recommendations: ['Gana ivuriro ryihuse bitarenze uyu munsi'],
    };
    const createdAssessment = createdAssessmentMock(hypertensionDto, {
      id: 'assessment-2',
      readings: hypertensionDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    });

    userService.findUserByPatientNumber.mockResolvedValue({
      id: 'patient-2',
      district: 'Kigali',
      communityHealthUnit: 'hospital-1',
    });
    vi.spyOn(Indicator, 'findById').mockReturnValue(createIndicatorLeanQuery(indicatorDoc) as any);
    vi.spyOn(AssessmentClassifier.prototype, 'classifyHypertension').mockReturnValue(classificationResult);
    vi.spyOn(Assessment, 'create').mockResolvedValue([createdAssessment] as any);

    const result = await service.createAssessment(hypertensionDto as any, 'evaluator-2');

    expect(AssessmentClassifier.prototype.classifyHypertension).toHaveBeenCalledWith(
      hypertensionDto.readings,
      indicatorDoc,
    );
    expect(referralService.createReferral).toHaveBeenCalledWith(
      'assessment-2',
      'patient-2',
      'evaluator-2',
      hypertensionDto.takenFrom,
      hypertensionDto.takenFromType,
      'hospital-1',
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

  it('passes existing pending referral through to referral service when provided', async () => {
    const indicatorDoc = {
      name: 'hypertension',
      readings: [
        { type: 'systolic_blood_pressure', unit: 'mmHg' },
        { type: 'diastolic_blood_pressure', unit: 'mmHg' },
      ],
      classifications: [],
    };
    const classificationResult = {
      classification: {
        label: 'Hypertensive Crisis',
        status_code: 'critical' as const,
      },
      recommendations: ['Gana ivuriro ryihuse bitarenze uyu munsi'],
    };
    const createdAssessment = createdAssessmentMock(hypertensionDto, {
      id: 'assessment-pending',
      readings: hypertensionDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    });
    const existingPending = { _id: 'pending-ref-1' } as any;

    userService.findUserByPatientNumber.mockResolvedValue({
      id: 'patient-p',
      district: 'Kigali',
      communityHealthUnit: 'hospital-1',
    });
    vi.spyOn(Indicator, 'findById').mockReturnValue(createIndicatorLeanQuery(indicatorDoc) as any);
    vi.spyOn(AssessmentClassifier.prototype, 'classifyHypertension').mockReturnValue(classificationResult);
    vi.spyOn(Assessment, 'create').mockResolvedValue([createdAssessment] as any);

    await service.createAssessment(hypertensionDto as any, 'evaluator-p', existingPending);

    expect(referralService.createReferral).toHaveBeenCalledWith(
      'assessment-pending',
      'patient-p',
      'evaluator-p',
      hypertensionDto.takenFrom,
      hypertensionDto.takenFromType,
      'hospital-1',
      existingPending,
      session,
    );
  });

  it('passes CHU source and patient destination when creating a referral', async () => {
    const indicatorDoc = {
      name: 'hypertension',
      readings: [
        { type: 'systolic_blood_pressure', unit: 'mmHg' },
        { type: 'diastolic_blood_pressure', unit: 'mmHg' },
      ],
      classifications: [],
    };
    const classificationResult = {
      classification: {
        label: 'Hypertensive Crisis',
        status_code: 'critical' as const,
      },
      recommendations: ['Gana ivuriro ryihuse bitarenze uyu munsi'],
    };
    const createdAssessment = createdAssessmentMock(hypertensionDto, {
      id: 'assessment-3',
      readings: hypertensionDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    });

    userService.findUserByPatientNumber.mockResolvedValue({
      id: 'patient-3',
      district: 'Musanze',
      communityHealthUnit: 'hospital-musanze',
    });
    vi.spyOn(Indicator, 'findById').mockReturnValue(createIndicatorLeanQuery(indicatorDoc) as any);
    vi.spyOn(AssessmentClassifier.prototype, 'classifyHypertension').mockReturnValue(classificationResult);
    vi.spyOn(Assessment, 'create').mockResolvedValue([createdAssessment] as any);

    await service.createAssessment(hypertensionDto as any, 'evaluator-3');

    expect(referralService.createReferral).toHaveBeenCalledWith(
      'assessment-3',
      'patient-3',
      'evaluator-3',
      hypertensionDto.takenFrom,
      hypertensionDto.takenFromType,
      'hospital-musanze',
      undefined,
      session,
    );
  });

  it('throws when referral source is not CHU for abnormal assessment', async () => {
    const indicatorDoc = {
      name: 'hypertension',
      readings: [
        { type: 'systolic_blood_pressure', unit: 'mmHg' },
        { type: 'diastolic_blood_pressure', unit: 'mmHg' },
      ],
      classifications: [],
    };
    const classificationResult = {
      classification: {
        label: 'Hypertensive Crisis',
        status_code: 'critical' as const,
      },
      recommendations: ['Gana ivuriro ryihuse bitarenze uyu munsi'],
    };
    const nonChuDto = {
      ...hypertensionDto,
      takenFromType: ModelNames.Hospital,
    };

    const createdAssessment = createdAssessmentMock(nonChuDto, {
      id: 'assessment-4',
      readings: hypertensionDto.readings,
      classification: classificationResult.classification,
      recommendations: classificationResult.recommendations,
    });

    userService.findUserByPatientNumber.mockResolvedValue({
      id: 'patient-4',
      district: 'Nyagatare',
      communityHealthUnit: 'hospital-nyagatare',
    });
    vi.spyOn(Indicator, 'findById').mockReturnValue(createIndicatorLeanQuery(indicatorDoc) as any);
    vi.spyOn(AssessmentClassifier.prototype, 'classifyHypertension').mockReturnValue(classificationResult);
    const createSpy = vi.spyOn(Assessment, 'create').mockResolvedValue([createdAssessment] as any);

    await expect(service.createAssessment(nonChuDto as any, 'evaluator-4')).rejects.toThrow(
      'Referral creation for non-CHU sources is not implemented yet',
    );

    expect(createSpy).toHaveBeenCalledOnce();
    expect(referralService.createReferral).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it('throws IndicatorNotFound when the indicator does not exist', async () => {
    vi.spyOn(Indicator, 'findById').mockReturnValue(createIndicatorLeanQuery(null) as any);
    const assessmentCreateSpy = vi.spyOn(Assessment, 'create');

    await expect(service.createAssessment(diabetesDto as any, 'evaluator-1')).rejects.toBeInstanceOf(IndicatorNotFound);

    expect(assessmentCreateSpy).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it('throws PatientNotFoundException when the patient clinical profile does not exist', async () => {
    const indicatorDoc = {
      name: 'diabetes',
      readings: [{ type: 'random_blood_glucose', unit: 'mg/dL' }],
      classifications: [],
    };

    userService.findUserByPatientNumber.mockRejectedValue(new PatientNotFoundException());
    vi.spyOn(Indicator, 'findById').mockReturnValue(createIndicatorLeanQuery(indicatorDoc) as any);
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
    const dtoWithWrongUnit = {
      ...diabetesDto,
      readings: {
        random_blood_glucose: {
          value: 139,
          unit: 'mmol/L',
        },
      },
    };

    vi.spyOn(Indicator, 'findById').mockReturnValue(createIndicatorLeanQuery(indicatorDoc) as any);
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
    const classificationResult = {
      classification: {
        label: 'Normal',
        status_code: 'healthy' as const,
      },
      recommendations: ['Komeza kurya indyo yuzuye'],
    };

    vi.spyOn(Indicator, 'findById').mockReturnValue(createIndicatorLeanQuery(indicatorDoc) as any);
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

describe('AssessmentService.getAssessmentById', () => {
  let referralService: { createReferral: ReturnType<typeof vi.fn> };
  let userService: { findUserByPatientNumber: ReturnType<typeof vi.fn> };
  let service: AssessmentService;

  beforeEach(() => {
    referralService = { createReferral: vi.fn() };
    userService = { findUserByPatientNumber: vi.fn() };
    service = new AssessmentService(referralService as any, userService as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no document exists', async () => {
    const chain = createAssessmentQueryChain(null);
    vi.spyOn(Assessment, 'findById').mockReturnValue(chain as any);

    const result = await service.getAssessmentById('missing-id');

    expect(Assessment.findById).toHaveBeenCalledWith('missing-id');
    expect(chain.select).toHaveBeenCalled();
    expect(chain.exec).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('maps lean document fields to AssessmentDetailsDTO', async () => {
    const patientId = new mongoose.Types.ObjectId();
    const indicatorId = new mongoose.Types.ObjectId();
    const evaluatorId = new mongoose.Types.ObjectId();
    const evaluatedAt = new Date('2026-01-15T10:00:00.000Z');
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      patient: patientId,
      patientNumber: 555,
      indicator: indicatorId,
      evaluatedBy: evaluatorId,
      readings: { random_blood_glucose: { value: 100, unit: 'mg/dL' } },
      classification: { label: 'Normal', status_code: 'healthy' as const },
      recommendations: ['r1'],
      takenFrom: 'chu-x',
      takenFromType: ModelNames.CommunityHealthUnit,
      evaluatedAt,
    };

    vi.spyOn(Assessment, 'findById').mockReturnValue(createAssessmentQueryChain(doc) as any);

    const result = await service.getAssessmentById(doc._id.toString());

    expect(result).toEqual({
      id: doc._id.toString(),
      patient: patientId.toString(),
      indicator: indicatorId.toString(),
      evaluatedBy: evaluatorId.toString(),
      patientNumber: 555,
      readings: doc.readings,
      classification: doc.classification,
      takenFrom: doc.takenFrom,
      takenFromType: doc.takenFromType,
      recommendations: doc.recommendations,
      evaluatedAt,
    });
  });

  it('defaults evaluatedBy to empty string and recommendations to [] when missing', async () => {
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      patient: new mongoose.Types.ObjectId(),
      patientNumber: 1,
      indicator: new mongoose.Types.ObjectId(),
      readings: {},
      classification: { label: 'X', status_code: 'warning' as const },
      takenFrom: 'chu-y',
      takenFromType: ModelNames.CommunityHealthUnit,
      evaluatedAt: new Date(),
    };

    vi.spyOn(Assessment, 'findById').mockReturnValue(createAssessmentQueryChain(doc) as any);

    const result = await service.getAssessmentById(doc._id.toString());

    expect(result?.evaluatedBy).toBe('');
    expect(result?.recommendations).toEqual([]);
  });
});

describe('AssessmentService.getAssessmentIndicator', () => {
  let service: AssessmentService;

  beforeEach(() => {
    service = new AssessmentService({ createReferral: vi.fn() } as any, { findUserByPatientNumber: vi.fn() } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns indicator projection from Assessment.findById', async () => {
    const leanResult = { indicator: new mongoose.Types.ObjectId() };
    const exec = vi.fn().mockResolvedValue(leanResult);
    const lean = vi.fn().mockReturnValue({ exec });
    const select = vi.fn().mockReturnValue({ lean });
    vi.spyOn(Assessment, 'findById').mockReturnValue({ select } as any);

    const result = await service.getAssessmentIndicator('aid-1');

    expect(Assessment.findById).toHaveBeenCalledWith('aid-1');
    expect(select).toHaveBeenCalledWith('indicator');
    expect(result).toBe(leanResult);
  });
});

describe('AssessmentService.listAssessmentsByEvaluatorLast24Hours', () => {
  let service: AssessmentService;

  beforeEach(() => {
    service = new AssessmentService({ createReferral: vi.fn() } as any, { findUserByPatientNumber: vi.fn() } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns aggregate results for the evaluator', async () => {
    const rows = [
      {
        _id: 'a1',
        patientNumber: 10,
        patientName: 'Jane Doe',
        indicatorName: 'hypertension',
        classificationLabel: 'warning',
      },
    ];
    const exec = vi.fn().mockResolvedValue(rows);
    const aggregateSpy = vi.spyOn(Assessment, 'aggregate').mockReturnValue({ exec } as any);

    const result = await service.listAssessmentsByEvaluatorLast24Hours('507f1f77bcf86cd799439011');

    expect(aggregateSpy).toHaveBeenCalled();
    const pipeline = aggregateSpy.mock.calls[0]![0] as Array<{ $match?: Record<string, unknown> }>;
    const firstMatch = pipeline[0]?.$match;
    expect(firstMatch?.evaluatedBy).toEqual(new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'));
    expect((firstMatch?.evaluatedAt as { $gte?: Date } | undefined)?.$gte).toBeInstanceOf(Date);
    expect(result).toEqual(rows);
    expect(exec).toHaveBeenCalled();
  });
});
