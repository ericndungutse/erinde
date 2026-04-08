import type { ClientSession } from "mongoose";
import type { IReferral } from "../../domain/referral.js";
import type {
  IReferralDetails,
  IReferralMetricsSummary,
  IReferralSummary,
} from "../../dto/referral.dto.js";
import type { IReferralDocument } from "../../models/referral.model.js";
export interface IReferralService {
  countTotalReferrals(filter?: Record<string, unknown>): Promise<number>;

  countPendingReferrals(filter?: Record<string, unknown>): Promise<number>;

  countScheduledTodayReferrals(
    filter?: Record<string, unknown>,
  ): Promise<number>;

  countCompletedTodayReferrals(
    filter?: Record<string, unknown>,
  ): Promise<number>;

  countOverdueReferrals(filter?: Record<string, unknown>): Promise<number>;

  getReferralMetrics(
    filter?: Record<string, unknown>,
  ): Promise<IReferralMetricsSummary>;

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

  getAllReferrals(
    query?: Record<string, string | string[] | undefined>,
    filter?: {},
  ): Promise<any>;

  getCommingReferralVisitsIn48h(filter: {}): Promise<IReferralSummary[]>;

  /**
   * Get a single referral by id. No population, raw referral data only.
   */
  getReferralById(referralId: string): Promise<IReferralDetails | null>;

  /**
   * Get a single referral by patient number. No population, raw referral data only.
   */
  getPendingReferralByPatientNumber(
    patientNumber: number,
    session?: ClientSession,
  ): Promise<IReferral | null>;
}
