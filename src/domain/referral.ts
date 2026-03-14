import type { Types } from 'mongoose';
import type { ReferralStatus } from '../types/ReferralStatus.types.js';

export interface IReferral {
  patient: Types.ObjectId | string;
  patientNumber: number;

  // Link to the patient's clinical profile (source of truth for health worker)
  clinicalProfile: Types.ObjectId | string;

  // Date on which the referral was created (day precision)
  referralDate: Date | string;

  // Date when the patient is expected to go to hospital (referralDate + 3 days)
  scheduledVisitDate: Date | string;

  status: ReferralStatus;

  // Assessment document ids (populate when needed)
  assessments: Array<Types.ObjectId | string>;

  // User who recorded the assessment / initiated the referral
  referredBy: Types.ObjectId | string;

  visitDate?: Date | string;

  createdAt: Date;
  updatedAt: Date;
}
