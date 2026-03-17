import type { Types } from 'mongoose';

export interface IClinicalProfile {
  userId: Types.ObjectId;
  patientNumber: number;
}

