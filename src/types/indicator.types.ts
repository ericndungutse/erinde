import { Document } from 'mongoose';

export type StatusCode = 'healthy' | 'warning' | 'danger' | 'critical';

// 1. Define the Data Interface
export interface IIndicatorData {
  name: string;
  readings: {
    type: string;
    unit: string;
  }[];
  classifications: {
    status_code: StatusCode;
    label: string;
    min_systolic?: number;
    max_systolic?: number;
    min_diastolic?: number;
    max_diastolic?: number;
    min_value?: number;
    max_value?: number;
    logic?: 'OR' | 'AND';
    recommendations: string[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// SUmmery type
export interface IIndicatorSummary {
  id: string;
  name: string;
  labels: string[];
}

// Indicator Details type with all fields added by mongoose

// 2. Define the Model type
export type IIndicator = IIndicatorData & Document;

// 3. The API/UI type (used for frontend consumption)
export interface IIndicatorDetails extends Omit<IIndicatorData, 'createdAt' | 'updatedAt'> {
  id: string;
}
