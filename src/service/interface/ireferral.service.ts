import type { ClientSession } from 'mongoose';
import type { IReferral } from '../../domain/referral.js';
import type {
  GetHospitalReferralsResult,
  IReferralDetails,
  IReferralStatusSummary,
  IReferralSummary
} from '../../dto/referral.dto.js';
import type { IReferralDocument } from '../../models/referral.model.js';
export interface IReferralService {
  /**
   * Create or update a daily referral for a patient
   * based on abnormal assessments.
   *
   * @param assessmentId - Assessment id to attach to the referral
   * @param patientId - User id of the patient
   * @param referredBy - User id of the person who initiated the referral
   * @param from - Source of the referral (e.g. "ASSESSMENT")
   * @param fromType - Type of the source (e.g. "DAILY_ASSESSMENT")
   * @param to - Target destination for the referral (e.g. "HOSPITAL", "CLINIC")
   * @param existingPendingReferral - Optional existing pending referral for the same patient, used to prevent duplicates and attach new assessments to it
   * @returns void Promise that resolves when the referral is created or updated
   */
  createReferral(
    assessmentId: string,
    userId: string,
    referredBy: string,
    from: string,
    fromType: string,
    to: string,
    existingPendingReferral?: IReferralDocument | null,
    session?: ClientSession,
  ): Promise<void>;

  /**
   * List referrals for patients under a specific social health worker's follow-up.
   * Uses ClinicalProfile.healthWorkerId to scope visibility.
   *
   * @param healthWorkerId - Logged-in social health worker's user id
   * @returns Array of referrals for patients assigned to the given health worker
   */
  getReferralsByCommunityHealthUnit(
    communityHealthUnit: string,
    query?: Record<string, string | string[] | undefined>,
  ): Promise<any>;

  /**
   * List referrals for a specific hospital.
   * Intended for nurse views scoped to their assigned hospital.
   *
   * @param hospitalId - Hospital id of the logged-in nurse
   * @returns Paginated referrals for the specified hospital
   */
  listReferralsByHospital(
    hospitalId: string,
    query?: Record<string, string | string[] | undefined>,
  ): Promise<GetHospitalReferralsResult>;

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
