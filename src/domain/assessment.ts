import { ModelNames } from '../constants/constant.values.js';
import { Types } from 'mongoose';
import type { StatusCode } from '../types/indicator.types.js';

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

export interface IAssessment {
  patient: Types.ObjectId | string;
  indicator: Types.ObjectId | string;
  evaluatedBy: Types.ObjectId | string;
  readings: IAssessmentReadings;
  takenFromType: ModelNames;
  takenFrom: Types.ObjectId | string;
  classification: IAssessmentClassification;
  recommendations: string[];
  evaluatedAt: Date | string;
  evaluatedDate?: Date | string;
}
