import type {
  CreateAssessmentDTO,
  AssessmentCreatedResponseDTO,
  AssessmentDetailsDTO,
} from '../../types/assessment.types.js';

export interface IAssessmentService {
  /**
   * Create a new assessment record from DTO (user passes patientNumber, indicator, readings)
   * @param dto CreateAssessmentDTO payload
   * @param evaluatedBy optional evaluator  id
   */
  createAssessment(dto: CreateAssessmentDTO, evaluatedBy?: string): Promise<AssessmentCreatedResponseDTO>;

  /**
   * Get single assessment details by id (no population)
   */
  getAssessmentById(assessmentId: string): Promise<AssessmentDetailsDTO | null>;
}
