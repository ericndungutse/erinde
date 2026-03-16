import type { ReferralStatus } from '../types/ReferralStatus.types.js';
import type { PaginationMeta } from '../types/api.types.js';

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

export interface GetHealthWorkerReferralsResult {
  referrals: IReferralSummary[];
  pagination: PaginationMeta;
}

export interface GetHospitalReferralsResult {
  referrals: IReferralSummary[];
  pagination: PaginationMeta;
}
