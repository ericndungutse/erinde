import type { ClientSession } from 'mongoose';
import type { ReferralStatus } from '../../types/ReferralStatus.types.js';
import type { IReferralDetails, IReferralStatusSummary, IReferralSummary } from '../../dto/referral.dto.js';
import type { IReferral } from '../../domain/referral.js';
export interface IReferralService {
  /**
   * Create or update a daily referral for a patient
   * based on abnormal assessments.
   *
   * @param assessmentId - Assessment id to attach to the referral
   * @param patientId - User id of the patient
   * @param referredBy - User id of the person who initiated the referral
   */
  createReferral(
    assessmentId: string,
    patientId: string,
    hospitalId: String,
    referredBy: string,
    session?: ClientSession,
  ): Promise<void>;

  /**
   * List referrals for patients under a specific social health worker's follow-up.
   * Uses ClinicalProfile.healthWorkerId to scope visibility.
   *
   * @param healthWorkerId - Logged-in social health worker's user id
   * @returns Array of referrals for patients assigned to the given health worker
   */
  listReferralsByHealthWorker(healthWorkerId: string, status: ReferralStatus): Promise<IReferralSummary[]>;

  /**
   * List referrals for a specific hospital.
   * Intended for nurse views scoped to their assigned hospital.
   *
   * @param hospitalId - Hospital id of the logged-in nurse
   * @returns Array of referrals for the specified hospital
   */
  listReferralsByHospital(hospitalId: string): Promise<IReferralSummary[]>;

  /**
   * List upcoming referrals (future or today) for patients under a specific
   * social health worker's follow-up, ordered by scheduledVisitDate ascending.
   *
   * @param healthWorkerId - Logged-in social health worker's user id
   * @returns Array of upcoming referrals for patients assigned to the given health worker
   */
  listUpcomingReferralsByHealthWorker(healthWorkerId: string): Promise<IReferralSummary[]>;

  /**
   * Get total count of pending referrals for patients under a specific
   * social health worker's follow-up.
   *
   * @param healthWorkerId - Logged-in social health worker's user id
   * @returns Number of PENDING referrals for patients assigned to the given health worker
   */
  countPendingReferralsByHealthWorker(healthWorkerId: string): Promise<number>;

  /**
   * Get referral status overview (pending, completed this month, overdue)
   * for patients under the given social health worker's follow-up.
   */
  getReferralStatusOverviewByHealthWorker(healthWorkerId: string): Promise<IReferralStatusSummary>;

  /**
   * Get a single referral by id. No population, raw referral data only.
   */
  getReferralById(referralId: string): Promise<IReferralDetails | null>;

  /**
   * Get Single Referral by Patient Number. Mark status as COMPLETED. When Doen by NURSE
   */
  completeReferralByPatientNumber(patientNumber: number): Promise<any | null>;

  /**
   * Check if a patient currently has a pending referral.
   * Useful for preventing duplicate referrals or UI state management.
   * * @param patientNumber - Patient number to check for pending referrals
   * @returns Boolean indicating if a pending referral exists
   */
  hasPendingReferral(patientNumber: number): Promise<boolean>;

  /**
   * Get a single referral by patient number. No population, raw referral data only.
   */
  getPendingReferralByPatientNumber(patientNumber: number, session?: ClientSession): Promise<IReferral | null>;
}
