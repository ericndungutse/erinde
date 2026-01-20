import type { IReferralSummary, ReferralStatus, IReferralDetails } from '../../types/referral.types.js';

export interface IReferralService {
  /**
   * Create or update a daily referral for a patient
   * based on abnormal assessments.
   *
   * @param assessmentId - Assessment id to attach to the referral
   * @param patientId - User id of the patient
   * @param referredBy - User id of the person who initiated the referral
   */
  createReferral(assessmentId: string, patientId: string, referredBy: string): Promise<void>;

  /**
   * List referrals for patients under a specific social health worker's follow-up.
   * Uses ClinicalProfile.healthWorkerId to scope visibility.
   *
   * @param healthWorkerId - Logged-in social health worker's user id
   * @returns Array of referrals for patients assigned to the given health worker
   */
  listReferralsByHealthWorker(healthWorkerId: string, status: ReferralStatus): Promise<IReferralSummary[]>;

  /**
   * Get a single referral by id. No population, raw referral data only.
   */
  getReferralById(referralId: string): Promise<IReferralDetails | null>;

  /**
   * Get Single Referral by Patient Number. Mark status as COMPLETED. When Doen by NURSE
   */
  completeReferralByPatientNumber(patientNumber: number): Promise<any | null>;
}
