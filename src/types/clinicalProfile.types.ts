import type mongoose from 'mongoose';

export interface IClinicalProfileData {
  userId: mongoose.Types.ObjectId;
  patientNumber: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export type IClinicalProfile = IClinicalProfileData & mongoose.Document;
