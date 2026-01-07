import { Document } from 'mongoose';

// 1. Define the Data Interface
export interface IIndicatorData {
  name: string;
  readings: {
    type: string;
    unit: string;
  }[];
  classifications: {
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
