import type { Document, Types } from 'mongoose';

export interface IClinicalProfileData {
  userId: Types.ObjectId;
  patientNumber: number;
  status: 'ACTIVE' | 'INACTIVE';
  healthWorkerId?: Types.ObjectId;
}

export type IClinicalProfile = IClinicalProfileData & Document;
