import type { Document, Types } from 'mongoose';

// Daily referral for a patient, aggregating all non-normal assessments for a date

export type ReferralStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface IReferralData {
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

export type IReferral = IReferralData & Document;

// Summary projection for listing referrals
export interface IReferralSummary {
  id: string;
  patientNumber: number;
  referralDate: Date | string;
  scheduledVisitDate: Date | string;
  status: ReferralStatus;
  assessmentCount: number;
}

// Details DTO for a single referral (no population)
export interface IReferralDetails {
  id: string;
  patient: string; // ObjectId string
  patientNumber: number;
  clinicalProfile: string; // ObjectId string
  referralDate: Date | string;
  scheduledVisitDate: Date | string;
  status: ReferralStatus;
  assessments: string[]; // ObjectId strings
  referredBy: string; // ObjectId string
  createdAt: Date;
  updatedAt: Date;
  visitDate: Date;
}

export interface IReferralStatusSummary {
  pending: number;
  completed_this_month: number;
  overdue: number;
}
