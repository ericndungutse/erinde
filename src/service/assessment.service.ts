import ClinicalProfile from '../models/clinicalProfile.model.js';
import Indicator from '../models/indicator.model.js';
import type { ClientSession } from 'mongoose';

import AssessmentClassifier from './assessment-classifier.service.js';
import type {
  CreateAssessmentDTO,
  AssessmentCreatedResponseDTO,
  IAssessmentClassification,
  AssessmentDetailsDTO,
  IAssessment,
  RecentAssessmentSummaryDTO,
} from '../types/assessment.types.js';
import type { IAssessmentService } from './interface/iassessment.service.js';
import type { IIndicatorData } from '../types/indicator.types.js';
import type { IReferralService } from './interface/ireferral.service.js';
import HasPendingReferralError from '../Errors/HasPendingReferralError.js';
import { log } from 'node:console';
import InvalidUnit from '../Errors/InvalidUnits.js';
import IndicatorNotFound from '../Errors/IndicatorNotFoundError.js';
import PatientNotFoundException from '../Errors/PatientNotFoundException.js';
import mongoose from 'mongoose';
import { Assessment } from '../models/assessment.model.js';
import { AssessmentCreationError } from '../Errors/AssessmentCreationError.js';

export default class AssessmentService implements IAssessmentService {
  private referralService: IReferralService;

  constructor(referralService: IReferralService) {
    this.referralService = referralService;
  }

  getAssessmentIndicator(assessmentId: string): Promise<any | null> {
    return Assessment.findById(assessmentId).select('indicator').lean().exec();
  }

  async createAssessment(dto: CreateAssessmentDTO, evaluatedBy: string): Promise<AssessmentCreatedResponseDTO> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // 1. Validate indicator exists
      const indicatorDoc: any = await Indicator.findById(dto.indicator).session(session).lean();

      if (!indicatorDoc) {
        throw new IndicatorNotFound();
      }

      // 2. Validate pending referral
      const hasPendingReferral = await this.indicatorAssessmentExistsForPendingReferral(
        dto.patientNumber,
        dto.indicator,
        session,
      );

      if (hasPendingReferral) {
        throw new HasPendingReferralError();
      }

      // 3. Resolve patient
      const clinical = await ClinicalProfile.findOne({ patientNumber: dto.patientNumber }).session(session).lean();

      if (!clinical) {
        throw new PatientNotFoundException();
      }

      const patientId = clinical.userId;

      // 4. Validate reading units
      const invalids: string[] = [];
      Object.entries(dto.readings).forEach(([key, val]) => {
        const expected = (indicatorDoc.readings || []).find((r: any) => r.type === key);
        if (expected?.unit && val.unit && expected.unit !== val.unit) {
          invalids.push(`${key} expects unit ${expected.unit} but got ${val.unit}`);
        }
      });

      if (invalids.length) {
        throw new InvalidUnit(`Reading unit mismatch: ${invalids.join('; ')}`);
      }

      // 5. Classification
      let classification: IAssessmentClassification | undefined;
      let recommendations: string[] = [];

      const classifier = new AssessmentClassifier();

      switch (indicatorDoc.name) {
        case 'hypertension': {
          const r = classifier.classifyHypertension(dto.readings, indicatorDoc as IIndicatorData);
          classification = r.classification;
          recommendations = r.recommendations;
          break;
        }
        case 'bmi': {
          const r = classifier.classifyBmi(dto.readings, indicatorDoc as IIndicatorData);
          classification = r.classification;
          recommendations = r.recommendations;
          break;
        }
        case 'diabetes': {
          const r = classifier.classifyDiabetes(dto.readings, indicatorDoc as IIndicatorData);
          classification = r.classification;
          recommendations = r.recommendations;
          break;
        }
      }

      // 6. Create assessment
      const assessmentPayload = {
        patient: patientId,
        indicator: dto.indicator,
        evaluatedBy,
        readings: dto.readings,
        classification,
        recommendations,
        evaluatedAt: new Date(),
        evaluatedDate: new Date(new Date().setHours(0, 0, 0, 0)),
      };

      const [created] = await Assessment.create([assessmentPayload as IAssessment], { session: session ?? null });

      if (!created) {
        throw new AssessmentCreationError();
      }

      // 7. Create referral if abnormal
      if (classification && classification.status_code !== 'healthy') {
        await this.referralService.createReferral(created.id, patientId.toString(), evaluatedBy, session);
      }

      await session.commitTransaction();
      session.endSession();

      return {
        id: created.id,
        readings: created.readings,
        classification: created.classification,
        recommendations: created.recommendations,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Return single assessment details by id (no population)
   */
  async getAssessmentById(assessmentId: string): Promise<AssessmentDetailsDTO | null> {
    const doc = await Assessment.findById(assessmentId)
      .select({
        patient: 1,
        indicator: 1,
        evaluatedBy: 1,
        readings: 1,
        classification: 1,
        recommendations: 1,
        evaluatedAt: 1,
      })
      .lean()
      .exec();

    if (!doc) return null;

    const details: AssessmentDetailsDTO = {
      id: doc._id.toString(),
      patient: doc.patient.toString(),
      indicator: doc.indicator.toString(),
      evaluatedBy: doc.evaluatedBy?.toString() ?? '',
      readings: doc.readings,
      classification: doc.classification,
      recommendations: doc.recommendations ?? [],
      evaluatedAt: doc.evaluatedAt as any,
    };

    return details;
  }

  /**
   * List assessments taken by the given evaluator in the last 24 hours,
   * returning patient number, names, indicator name, and classification label.
   */
  async listAssessmentsByEvaluatorLast24Hours(evaluatorId: string): Promise<RecentAssessmentSummaryDTO[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const results = await Assessment.aggregate([
      {
        $match: {
          evaluatedBy: new mongoose.Types.ObjectId(evaluatorId),
          evaluatedAt: { $gte: since },
        },
      },
      {
        $lookup: {
          from: 'clinicalprofiles',
          localField: 'patient',
          foreignField: 'userId',
          as: 'cp',
        },
      },
      { $unwind: '$cp' },
      {
        $lookup: {
          from: 'users',
          localField: 'patient',
          foreignField: '_id',
          as: 'patientUser',
        },
      },
      { $unwind: '$patientUser' },
      {
        $lookup: {
          from: 'indicators',
          localField: 'indicator',
          foreignField: '_id',
          as: 'indicatorDoc',
        },
      },
      { $unwind: '$indicatorDoc' },
      { $sort: { evaluatedAt: -1 } },
      {
        $project: {
          _id: 1,
          patientNumber: '$cp.patientNumber',
          patientName: {
            $concat: ['$patientUser.firstname', ' ', '$patientUser.lastname'],
          },
          indicatorName: '$indicatorDoc.name',
          classificationLabel: '$classification.label',
        },
      },
    ]).exec();

    return results as RecentAssessmentSummaryDTO[];
  }

  private async indicatorAssessmentExistsForPendingReferral(
    patientNumber: number,
    indicatorId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const referral = await this.referralService.getPendingReferralByPatientNumber(patientNumber, session);

    if (!referral) {
      return false;
    }

    for (const assessmentId of referral.assessments) {
      const assessment = await this.getAssessmentIndicator(assessmentId.toString());

      if (assessment && assessment.indicator.toString() === indicatorId) {
        return true;
      }
    }

    return false;
  }
}
