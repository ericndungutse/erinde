import type { ClientSession } from 'mongoose';
import Indicator from '../models/indicator.model.js';

import AssessmentClassifier from './assessment-classifier.service.js';

import mongoose from 'mongoose';
import { ModelNames } from '../constants/constant.values.js';
import type { IAssessment, IAssessmentClassification } from '../domain/assessment.js';
import type { IReferral } from '../domain/referral.js';
import type {
  AssessmentCreatedResponseDTO,
  AssessmentDetailsDTO,
  CreateAssessmentDTO,
  RecentAssessmentSummaryDTO,
} from '../dto/assessmentDto.js';
import { AssessmentCreationError } from '../Errors/AssessmentCreationError.js';
import IndicatorNotFound from '../Errors/IndicatorNotFoundError.js';
import InvalidUnit from '../Errors/InvalidUnits.js';
import { Assessment } from '../models/assessment.model.js';
import type { IReferralDocument } from '../models/referral.model.js';
import type { IIndicatorData } from '../types/indicator.types.js';
import type { IAssessmentService } from './interface/iassessment.service.js';
import type { IReferralService } from './interface/ireferral.service.js';
import type { IUserService } from './interface/iuser.service.js';
import { subHours } from 'date-fns';

export default class AssessmentService implements IAssessmentService {
  private referralService: IReferralService;
  private _userService: IUserService;

  constructor(referralService: IReferralService, userService: IUserService) {
    this.referralService = referralService;
    this._userService = userService;
  }

  getAssessmentIndicator(assessmentId: string): Promise<any | null> {
    return Assessment.findById(assessmentId).select('indicator').lean().exec();
  }

  async createAssessment(
    dto: CreateAssessmentDTO,
    evaluatedBy: string,
    existingPendingReferral?: IReferralDocument | null,
  ): Promise<AssessmentCreatedResponseDTO> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const indicatorDoc = await this.getIndicatorOrThrow(dto.indicator);

      this.validateReadingUnits(dto, indicatorDoc);

      const patient = await this._userService.findUserByPatientNumber(dto.patientNumber, session);

      const { classification, recommendations } = this.classifyAssessment(dto, indicatorDoc);

      const assessmentPayload = this.buildAssessmentPayload(
        dto,
        evaluatedBy,
        // Stands for user ID
        patient.id,
        classification,
        recommendations,
      );

      const created = await this.createAssessmentRecord(assessmentPayload, session);

      await this.createReferralIfNeeded(
        created.id,
        patient,
        evaluatedBy,
        classification,
        dto.takenFrom,
        dto.takenFromType,
        session,
        existingPendingReferral ? existingPendingReferral : undefined,
      );

      await session.commitTransaction();

      return {
        id: created.id,
        readings: created.readings,
        classification: created.classification,
        recommendations: created.recommendations,
        takenFrom: created.takenFrom,
        takenFromType: created.takenFromType,
        patientNumber: created.patientNumber,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Return single assessment details by id (no population)
   */
  async getAssessmentById(assessmentId: string): Promise<AssessmentDetailsDTO | null> {
    const doc = await Assessment.findById(assessmentId)
      .select({
        patient: 1,
        patientNumber: 1,
        indicator: 1,
        evaluatedBy: 1,
        readings: 1,
        takenFrom: 1,
        takenFromType: 1,
        classification: 1,
        recommendations: 1,
        evaluatedAt: 1,
      })
      .populate('patient', '_id firstname lastname')
      .populate('indicator', '_id name')
      .populate('evaluatedBy', '_id firstname lastname')
      .populate('takenFrom', '_id name')
      .lean<AssessmentDetailsDTO>()
      .exec();

    if (!doc) return null;

    return {
      ...doc,
      id: (doc as any)._id.toString(),
    };
  }

  /**
   * List assessments taken by the given evaluator in the last 24 hours,
   * returning patient number, names, indicator name, and classification label.
   */
  async listAssessmentsByEvaluatorLast24Hours(evaluatorId: string): Promise<RecentAssessmentSummaryDTO[]> {
    const since = subHours(new Date(), 24);

    const assessments = await Assessment.find({
      evaluatedBy: new mongoose.Types.ObjectId(evaluatorId),
      evaluatedAt: { $gte: since },
    })
      .select('patientNumber patient indicator classification recommendations takenFrom takenFromType _id')
      .populate('patient', '_id firstname lastname')
      .populate('indicator', '_id name')
      .lean<RecentAssessmentSummaryDTO[]>()
      .exec();

    return assessments;
  }

  private async getIndicatorOrThrow(indicatorId: string): Promise<IIndicatorData> {
    const indicatorDoc = await Indicator.findById(indicatorId).lean();

    if (!indicatorDoc) {
      throw new IndicatorNotFound();
    }

    return indicatorDoc as IIndicatorData;
  }

  private validateReadingUnits(dto: CreateAssessmentDTO, indicatorDoc: IIndicatorData): void {
    const invalids: string[] = [];

    Object.entries(dto.readings).forEach(([key, val]) => {
      const expected = (indicatorDoc.readings || []).find((r) => r.type === key);
      if (expected?.unit && val.unit && expected.unit !== val.unit) {
        invalids.push(`${key} expects unit ${expected.unit} but got ${val.unit}`);
      }
    });

    if (invalids.length) {
      throw new InvalidUnit(`Reading unit mismatch: ${invalids.join('; ')}`);
    }
  }

  private classifyAssessment(
    dto: CreateAssessmentDTO,
    indicatorDoc: IIndicatorData,
  ): {
    classification: IAssessmentClassification | undefined;
    recommendations: string[];
  } {
    let classification: IAssessmentClassification | undefined;
    let recommendations: string[] = [];
    const classifier = new AssessmentClassifier();

    switch (indicatorDoc.name) {
      case 'hypertension': {
        const r = classifier.classifyHypertension(dto.readings, indicatorDoc);
        classification = r.classification;
        recommendations = r.recommendations;
        break;
      }
      case 'bmi': {
        const r = classifier.classifyBmi(dto.readings, indicatorDoc);
        classification = r.classification;
        recommendations = r.recommendations;
        break;
      }
      case 'diabetes': {
        const r = classifier.classifyDiabetes(dto.readings, indicatorDoc);
        classification = r.classification;
        recommendations = r.recommendations;
        break;
      }
    }

    return { classification, recommendations };
  }

  private buildAssessmentPayload(
    dto: CreateAssessmentDTO,
    evaluatedBy: string,
    patientId: string,
    classification: IAssessmentClassification | undefined,
    recommendations: string[],
  ): IAssessment {
    return {
      patient: patientId,
      patientNumber: dto.patientNumber,
      indicator: dto.indicator,
      evaluatedBy,
      readings: dto.readings,
      classification,
      recommendations,
      takenFrom: dto.takenFrom,
      takenFromType: dto.takenFromType,
      evaluatedAt: new Date(),
      evaluatedDate: new Date(new Date().setHours(0, 0, 0, 0)),
    } as IAssessment;
  }

  private async createAssessmentRecord(assessmentPayload: IAssessment, session: ClientSession) {
    const [created] = await Assessment.create([assessmentPayload], {
      session: session ?? null,
    });

    if (!created) {
      throw new AssessmentCreationError();
    }

    return created;
  }

  private async createReferralIfNeeded(
    assessmentId: string,
    patient: any,
    evaluatedBy: string,
    classification: IAssessmentClassification | undefined,
    takenFrom: string,
    takenFromType: string,
    session: ClientSession,
    existingPendingReferral?: IReferralDocument | null,
  ): Promise<void> {
    if (!classification || classification.status_code === 'healthy') {
      return;
    }

    // If referral from CHU, hospitalId is chu.healthCenterId
    if (takenFromType === ModelNames.CommunityHealthUnit) {
      await this.referralService.createReferral(
        assessmentId,
        patient.id.toString(),
        evaluatedBy,
        takenFrom,
        takenFromType,
        patient.communityHealthUnit,
        existingPendingReferral,
        session,
      );
    } else {
      throw new Error('Referral creation for non-CHU sources is not implemented yet');
    }
  }
}
