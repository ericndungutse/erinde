import ClinicalProfile from '../models/clinicalProfile.model.js';
import Indicator from '../models/indicator.model.js';

import Assessment from '../models/assessment.model.js';
import type { CreateAssessmentDTO, IAssessmentResult } from '../types/assessment.types.js';
import type { IAssessmentService } from './interface/iassessment.service.js';

export default class AssessmentService implements IAssessmentService {
  async createAssessment(dto: CreateAssessmentDTO, evaluatedBy?: string): Promise<IAssessmentResult> {
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

    // Prepare assessment payload
    const assessmentPayload: any = {
      patient: patientId,
      indicator: dto.indicator,
      evaluatedBy: evaluatedBy,
      readings: dto.readings,
      evaluatedAt: new Date(),
    };

    const created = await Assessment.create(assessmentPayload as any);

    return (created.toObject ? created.toObject() : created) as IAssessmentResult;
  }
}
