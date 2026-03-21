import ClinicalProfile from '../models/clinicalProfile.model.js';
import Indicator from '../models/indicator.model.js';
import type { ClientSession } from 'mongoose';

import AssessmentClassifier from './assessment-classifier.service.js';

import type { IAssessmentService } from './interface/iassessment.service.js';
import type { IIndicatorData } from '../types/indicator.types.js';
import type { IReferralService } from './interface/ireferral.service.js';
import HasPendingReferralError from '../Errors/HasPendingReferralError.js';
import InvalidUnit from '../Errors/InvalidUnits.js';
import IndicatorNotFound from '../Errors/IndicatorNotFoundError.js';
import PatientNotFoundException from '../Errors/PatientNotFoundException.js';
import mongoose from 'mongoose';
import { Assessment } from '../models/assessment.model.js';
import { AssessmentCreationError } from '../Errors/AssessmentCreationError.js';
import type { IUserService } from './interface/iuser.service.js';
import Hospital from '../models/hospital.model.js';
import type {
  AssessmentCreatedResponseDTO,
  AssessmentDetailsDTO,
  CreateAssessmentDTO,
  RecentAssessmentSummaryDTO,
} from '../dto/assessmentDto.js';
import type { IAssessment, IAssessmentClassification } from '../domain/assessment.js';

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

  async createAssessment(dto: CreateAssessmentDTO, evaluatedBy: string): Promise<AssessmentCreatedResponseDTO> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const indicatorDoc = await this.getIndicatorOrThrow(dto.indicator, session);

      await this.ensureNoPendingReferral(dto.patientNumber, dto.indicator, session);

      const patient = await this._userService.findUserByPatientNumber(dto.patientNumber, session);

      this.validateReadingUnits(dto, indicatorDoc);

      const { classification, recommendations } = this.classifyAssessment(dto, indicatorDoc);

      const assessmentPayload = this.buildAssessmentPayload(
        dto,
        evaluatedBy,
        patient.id,
        classification,
        recommendations,
      );

      const created = await this.createAssessmentRecord(assessmentPayload, session);
      await this.createReferralIfNeeded(created.id, patient.id, evaluatedBy, classification, patient.district, session);

      await session.commitTransaction();

      return {
        id: created.id,
        readings: created.readings,
        classification: created.classification,
        recommendations: created.recommendations,
        takenFrom: created.takenFrom,
        takenFromType: created.takenFromType,
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
      takenFrom: doc.takenFrom,
      takenFromType: doc.takenFromType,
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

  private async getIndicatorOrThrow(indicatorId: string, session: ClientSession): Promise<IIndicatorData> {
    const indicatorDoc = await Indicator.findById(indicatorId).session(session).lean();

    if (!indicatorDoc) {
      throw new IndicatorNotFound();
    }

    return indicatorDoc as IIndicatorData;
  }

  private async ensureNoPendingReferral(
    patientNumber: number,
    indicatorId: string,
    session: ClientSession,
  ): Promise<void> {
    const hasPendingReferral = await this.indicatorAssessmentExistsForPendingReferral(
      patientNumber,
      indicatorId,
      session,
    );

    if (hasPendingReferral) {
      throw new HasPendingReferralError();
    }
  }

  private async getPatientIdOrThrow(patientNumber: number, session: ClientSession): Promise<string> {
    const clinical = await ClinicalProfile.findOne({ patientNumber }).session(session).lean();

    if (!clinical) {
      throw new PatientNotFoundException();
    }

    return clinical.userId.toString();
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
  ): { classification: IAssessmentClassification | undefined; recommendations: string[] } {
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
    const [created] = await Assessment.create([assessmentPayload], { session: session ?? null });

    if (!created) {
      throw new AssessmentCreationError();
    }

    return created;
  }

  private async createReferralIfNeeded(
    assessmentId: string,
    patientId: string,
    evaluatedBy: string,
    classification: IAssessmentClassification | undefined,
    districtOfPatient: string,
    session: ClientSession,
  ): Promise<void> {
    if (!classification || classification.status_code === 'healthy') {
      return;
    }
    const hospitalId = await this.getDistrictHospitalId(districtOfPatient, session);

    if (!hospitalId) {
      throw new Error('No hospital found for the specified district');
    }

    await this.referralService.createReferral(assessmentId, patientId, hospitalId, evaluatedBy, session);
  }

  // Resolve district hospitalId
  // Search for the district hospital in the same district as the patient's
  private async getDistrictHospitalId(district: string, session: ClientSession): Promise<string | null> {
    const hospital = await Hospital.findOne({ 'address.district': district }).session(session).lean();
    return hospital ? hospital._id.toString() : null;
  }
}
