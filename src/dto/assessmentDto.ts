import { z } from 'zod';
import { ModelNames } from '../constants/constant.values.js';
import type { IAssessment, IAssessmentClassification, IAssessmentReadings } from '../domain/assessment.js';
import type { Types } from 'mongoose';

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
  _id: Types.ObjectId | string;
  patientNumber: number;
  patient: {
    _id: Types.ObjectId | string;
    firstname: string;
    lastname: string;
  };
  indicator: {
    _id: Types.ObjectId | string;
    name: string;
  };
  classification: {
    label: string;
    status_code: string;
  };
  recommendations: string[];
  takenFrom: Types.ObjectId | string;
  takenFromType: ModelNames;
}

//  Details DTO for a single assessment (no population)
export type AssessmentDetailsDTO = {
  id: string;
  patientNumber: number;
  patient: {
    _id: Types.ObjectId | string;
    firstname: string;
    lastname: string;
  };
  indicator: {
    _id: Types.ObjectId | string;
    name: string;
  };
  evaluatedBy: {
    _id: Types.ObjectId | string;
    firstname: string;
    lastname: string;
  };
  takenFrom: {
    _id: Types.ObjectId | string;
    name: string;
  };
  takenFromType: ModelNames;
  readings: IAssessmentReadings;
  classification: IAssessmentClassification;
  recommendations: string[];
  evaluatedAt: Date | string;
};

export type AssessmentCreatedResponseDTO = Omit<
  IAssessment,
  'patient' | 'indicator' | 'evaluatedBy' | 'evaluatedAt'
> & {
  id: string;
};
