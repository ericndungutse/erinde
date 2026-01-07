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

// 2. Define the Model type
export type IIndicator = IIndicatorData & Document;
