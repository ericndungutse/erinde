import { z } from 'zod';
import { ModelNames } from '../constants/constant.values.js';
import type { IAssessment } from '../domain/assessment.js';

// Zod schemas for runtime validation when creating an assessment
export const AssessmentReadingSchemaZ = z.object({
  value: z.number().int().positive(),
  unit: z.string().min(1, 'reading.unit cannot be empty'),
});

// use explicit key + value for z.record to satisfy TypeScript definitions
export const AssessmentReadingsSchemaZ = z.record(z.string(), AssessmentReadingSchemaZ);

export const CreateAssessmentSchemaZ = z.object(
  {
    // patientNumber (not patient ObjectId) as the user will pass patient number
    patientNumber: z.number().positive('patientNumber must be a positive integer'),
    // indicator id as string (ObjectId string expected)
    indicator: z.string().min(1, 'indicator id cannot be empty'),
    // dynamic readings map
    readings: AssessmentReadingsSchemaZ,
    // new fields for context
    takenFrom: z.string().min(1, 'takenFrom is required'),
    takenFromType: z.nativeEnum(ModelNames, { message: 'takenFromType is required' }),
  },
  { message: 'Required fields are missing or invalid types provided' },
);

export type CreateAssessmentDTO = z.infer<typeof CreateAssessmentSchemaZ>;

export interface RecentAssessmentSummaryDTO {
  id: string;
  patientNumber: number;
  patientName: string;
  indicatorName: string;
  classificationLabel: string;
}

//  Details DTO for a single assessment (no population)
export type AssessmentDetailsDTO = Omit<IAssessment, never> & { id: string };

export type AssessmentCreatedResponseDTO = Omit<
  IAssessment,
  'patient' | 'indicator' | 'evaluatedBy' | 'evaluatedAt'
> & {
  id: string;
};
