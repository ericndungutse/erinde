import { z } from 'zod';

// CreateAssessmentSchemaZ and CreateAssessmentDTO moved to dto/assessmentDto.ts

/**
 * Single reading value (raw data)
 */
// export interface IAssessmentReading {
//   value: number;
//   unit: string;
// }

// /**
//  * Dynamic readings map
//  * Example keys:
//  * - systolic_blood_pressure
//  * - diastolic_blood_pressure
//  * - random_blood_glucose
//  */
// export interface IAssessmentReadings {
//   [readingType: string]: IAssessmentReading;
// }

// /**
//  * Classification outcome
//  */
// export interface IAssessmentClassification {
//   label: string;
//   status_code: StatusCode;
// }

/**
 * Main assessment result
 */
// export interface IAssessmentData {
//   patient: Types.ObjectId | string;
//   indicator: Types.ObjectId | string;
//   evaluatedBy: Types.ObjectId | string;
//   readings: IAssessmentReadings;
//   classification: IAssessmentClassification;
//   recommendations: string[];
//   evaluatedAt: Date | string;
//   evaluatedDate?: Date | string;
// }
