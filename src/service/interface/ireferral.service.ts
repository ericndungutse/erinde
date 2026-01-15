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
}
