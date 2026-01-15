import ClinicalProfile from '../models/clinicalProfile.model.js';
import Assessment from '../models/assessment.model.js';
import Referral from '../models/referral.model.js';
import type { IReferralService } from './interface/ireferral.service.js';

export class ReferralService implements IReferralService {
  /**
   * Create or update a daily referral for a patient based on
   * a single assessment.
   *
   * One referral per patient per day:
   * - If a referral for (patient, referralDate) exists, append the assessment id.
   * - Otherwise create a new referral.
   */
  async createReferral(assessmentId: string, patientId: string, referredBy: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Check for an existing PENDING referral for this patient today
    const existingReferral = await Referral.findOne({
      patient: patientId,
      referralDate: today,
      status: 'PENDING',
    }).exec();

    if (existingReferral) {
      // Update: Add assessment ID if it's not already in the array
      if (!existingReferral.assessments.includes(assessmentId)) {
        existingReferral.assessments.push(assessmentId);
        await existingReferral.save();
      }
      return;
    }

    // 2. If no referral exists, fetch necessary profiles and create a new one
    const [assessment, clinicalProfile] = await Promise.all([
      Assessment.findById(assessmentId).lean().exec(),
      ClinicalProfile.findOne({ userId: patientId }).lean().exec(),
    ]);

    if (!assessment || !clinicalProfile) {
      throw new Error('Required Assessment or Clinical Profile not found');
    }

    const scheduledVisitDate = new Date(today);
    scheduledVisitDate.setDate(scheduledVisitDate.getDate() + 30); // Now + 30 days

    await Referral.create({
      patient: patientId,
      patientNumber: clinicalProfile.patientNumber,
      clinicalProfile: clinicalProfile._id,
      referralDate: today,
      scheduledVisitDate,
      status: 'PENDING',
      assessments: [assessmentId],
      referredBy,
    });
  }
}

export default ReferralService;
