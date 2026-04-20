import type { IReferral } from "../domain/referral.js";
import type { ReferralStatus } from "../types/ReferralStatus.types.js";
import type { PaginationMeta } from "../types/api.types.js";

export interface IReferralSummary {
  id: string;
  patientNumber: number;
  referralDate: Date | string;
  scheduledVisitDate: Date | string;
  status: ReferralStatus;
  assessmentCount: number;
}

// Details DTO for a single referral (no population)
export interface IReferralDetails extends IReferral {
  id: string;
}

export interface IReferralMetricsSummary {
  total: number;
  pending: number;
  scheduled_today: number;
  completed_today: number;
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
