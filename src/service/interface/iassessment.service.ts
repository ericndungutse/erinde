import type { AnyARecord } from 'dns';
import type {
  CreateAssessmentDTO,
  AssessmentCreatedResponseDTO,
  AssessmentDetailsDTO,
  RecentAssessmentSummaryDTO,
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

  getAssessmentIndicator(assessmentId: string): Promise<any | null>;

  /**
   * List assessments taken by a specific evaluator in the last 24 hours,
   * returning patient number, patient name, indicator name, and classification label.
   */
  listAssessmentsByEvaluatorLast24Hours(evaluatorId: string): Promise<RecentAssessmentSummaryDTO[]>;
}
