import { Document, Types } from 'mongoose';
import { z } from 'zod';
import type { StatusCode } from './indicator.types.js';
import { omit } from 'zod/mini';

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
  },
  { message: 'Required fields are missing or invalid types provided' }
);

export type CreateAssessmentDTO = z.infer<typeof CreateAssessmentSchemaZ>;

/**
 * Single reading value (raw data)
 */
export interface IAssessmentReading {
  value: number;
  unit: string;
}

/**
 * Dynamic readings map
 * Example keys:
 * - systolic_blood_pressure
 * - diastolic_blood_pressure
 * - random_blood_glucose
 */
export interface IAssessmentReadings {
  [readingType: string]: IAssessmentReading;
}

/**
 * Classification outcome
 */
export interface IAssessmentClassification {
  label: string;
  status_code: StatusCode;
}

/**
 * Main assessment result
 */
export interface IAssessmentData {
  patient: Types.ObjectId | string;
  indicator: Types.ObjectId | string;
  evaluatedBy: Types.ObjectId | string;
  readings: IAssessmentReadings;
  classification: IAssessmentClassification;
  recommendations: string[];
  evaluatedAt: Date | string;
}

export type AssessmentCreatedResponseDTO = Omit<
  IAssessmentData,
  'patient' | 'indicator' | 'evaluatedBy' | 'evaluatedAt'
> & {
  id: string;
};

export type IAssessment = IAssessmentData & Document;
