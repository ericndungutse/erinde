import type { IAssessmentResult, CreateAssessmentDTO } from '../../types/assessment.types.js';

export interface IAssessmentService {
  /**
   * Create a new assessment record from DTO (user passes patientNumber, indicator, readings)
   * @param dto CreateAssessmentDTO payload
   * @param evaluatedBy optional evaluator  id
   */
  createAssessment(dto: CreateAssessmentDTO, evaluatedBy?: string): Promise<IAssessmentResult>;
}
