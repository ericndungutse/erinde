import ClinicalProfile from '../models/clinicalProfile.model.js';
import Indicator from '../models/indicator.model.js';

import Assessment from '../models/assessment.model.js';
import AssessmentClassifier from './assessment-classifier.service.js';
import type {
  CreateAssessmentDTO,
  AssessmentCreatedResponseDTO,
  IAssessmentClassification,
  AssessmentDetailsDTO,
} from '../types/assessment.types.js';
import type { IAssessmentService } from './interface/iassessment.service.js';
import type { IIndicatorData } from '../types/indicator.types.js';
import type { IReferralService } from './interface/ireferral.service.js';
import HasPendingReferralError from '../Errors/HasPendingReferralError.js';
import { log } from 'node:console';
import InvalidUnit from '../Errors/InvalidUnits.js';

export default class AssessmentService implements IAssessmentService {
  private referralService: IReferralService;

  constructor(referralService: IReferralService) {
    this.referralService = referralService;
  }

  getAssessmentIndicator(assessmentId: string): Promise<any | null> {
    return Assessment.findById(assessmentId).select('indicator').lean().exec();
  }

  async createAssessment(dto: CreateAssessmentDTO, evaluatedBy: string): Promise<AssessmentCreatedResponseDTO> {
    try {
      // Validate indicator exists
      const indicatorDoc: any = await Indicator.findById(dto.indicator).lean();
      if (!indicatorDoc) {
        throw new Error(`Indicator ${dto.indicator} not found`);
      }

      // Validate if patient has pending referral with this indicator already
      const hasPendingReferral = await this.indicatorAssessmentExistsForPendingReferral(
        dto.patientNumber,
        dto.indicator,
      );
      if (hasPendingReferral) {
        throw new HasPendingReferralError();
      }

      // Resolve patient (user) by patientNumber
      const clinical = await ClinicalProfile.findOne({ patientNumber: dto.patientNumber }).lean();
      if (!clinical) {
        throw new Error(`Patient with number ${dto.patientNumber} not found`);
      }

      const patientId = clinical.userId;

      // Validate readings units against indicator definitions (if provided)
      const invalids: string[] = [];
      Object.entries(dto.readings).forEach(([key, val]) => {
        const expected = (indicatorDoc.readings || []).find((r: any) => r.type === key);
        if (expected && expected.unit && val.unit && expected.unit !== val.unit) {
          invalids.push(`${key} expects unit ${expected.unit} but got ${val.unit}`);
        }
      });

      if (invalids.length) {
        throw new InvalidUnit(`Reading unit mismatch: ${invalids.join('; ')}`);
      }

      // Classify assessment
      let classification: IAssessmentClassification | undefined;
      let recommendations: string[] = [];

      const classifier = new AssessmentClassifier();

      if (indicatorDoc.name === 'hypertension') {
        const result = classifier.classifyHypertension(dto.readings, indicatorDoc as IIndicatorData);
        classification = result.classification;
        recommendations = result.recommendations;
      } else if (indicatorDoc.name === 'bmi') {
        const result = classifier.classifyBmi(dto.readings, indicatorDoc as IIndicatorData);
        classification = result.classification;
        recommendations = result.recommendations;
      } else if (indicatorDoc.name === 'diabetes') {
        const result = classifier.classifyDiabetes(dto.readings, indicatorDoc as IIndicatorData);
        classification = result.classification;
        recommendations = result.recommendations;
      }

      // Prepare assessment payload
      const assessmentPayload: any = {
        patient: patientId,
        indicator: dto.indicator,
        evaluatedBy: evaluatedBy,
        readings: dto.readings,
        classification,
        recommendations,
        evaluatedAt: new Date(),
        evaluatedDate: new Date(new Date().setHours(0, 0, 0, 0)),
      };

      const created = await Assessment.create(assessmentPayload as any);

      const response: AssessmentCreatedResponseDTO = {
        id: created.id,
        readings: created.readings,
        classification: created.classification,
        recommendations: created.recommendations,
      };

      // Create referral if results are abnormal (not 'healthy')
      if (classification && classification.status_code !== 'healthy') {
        await this.referralService.createReferral(created.id, patientId.toString(), evaluatedBy);
      }

      return response;
    } catch (error) {
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

  private async indicatorAssessmentExistsForPendingReferral(
    patientNumber: number,
    indicatorId: string,
  ): Promise<boolean> {
    const referral = await this.referralService.getPendingReferralByPatientNumber(patientNumber);

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
