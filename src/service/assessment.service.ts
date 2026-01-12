import ClinicalProfile from '../models/clinicalProfile.model.js';
import Indicator from '../models/indicator.model.js';

import Assessment from '../models/assessment.model.js';
import AssessmentClassifier from './assessment-classifier.service.js';
import type {
  CreateAssessmentDTO,
  AssessmentCreatedResponseDTO,
  IAssessmentClassification,
} from '../types/assessment.types.js';
import type { IAssessmentService } from './interface/iassessment.service.js';
import type { IIndicatorData } from '../types/indicator.types.js';

export default class AssessmentService implements IAssessmentService {
  async createAssessment(dto: CreateAssessmentDTO, evaluatedBy?: string): Promise<AssessmentCreatedResponseDTO> {
    // Resolve patient (user) by patientNumber
    const clinical = await ClinicalProfile.findOne({ patientNumber: dto.patientNumber }).lean();
    if (!clinical) {
      throw new Error(`Patient with number ${dto.patientNumber} not found`);
    }

    const patientId = clinical.userId;

    // Validate indicator exists
    const indicatorDoc: any = await Indicator.findById(dto.indicator).lean();
    if (!indicatorDoc) {
      throw new Error(`Indicator ${dto.indicator} not found`);
    }

    // Validate readings units against indicator definitions (if provided)
    const invalids: string[] = [];
    Object.entries(dto.readings).forEach(([key, val]) => {
      const expected = (indicatorDoc.readings || []).find((r: any) => r.type === key);
      if (expected && expected.unit && val.unit && expected.unit !== val.unit) {
        invalids.push(`${key} expects unit ${expected.unit} but got ${val.unit}`);
      }
    });

    if (invalids.length) {
      throw new Error(`Reading unit mismatch: ${invalids.join('; ')}`);
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
    };

    const created = await Assessment.create(assessmentPayload as any);

    const response: AssessmentCreatedResponseDTO = {
      id: created.id,
      readings: created.readings,
      classification: created.classification,
      recommendations: created.recommendations,
    };

    // TODO: Create refur if results are not normal.

    // TODO: Log audit trail for assessment creation SEND SMS to patient of results and recomendations

    return response;
  }
}
