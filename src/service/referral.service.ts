import ClinicalProfile from '../models/clinicalProfile.model.js';
import Assessment from '../models/assessment.model.js';
import Referral from '../models/referral.model.js';
import mongoose from 'mongoose';
import type { IReferralService } from './interface/ireferral.service.js';
import type { IReferral, ReferralStatus } from '../types/referral.types.js';

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

  /**
   * List referrals for patients under the given social health worker's follow-up.
   * Uses ClinicalProfile.healthWorkerId to determine patient assignment.
   * Returns most recent first.
   */
  async listReferralsByHealthWorker(healthWorkerId: string, status: ReferralStatus = 'PENDING'): Promise<IReferral[]> {
    const hwObjectId = new mongoose.Types.ObjectId(healthWorkerId);

    const results = await Referral.aggregate([
      {
        $lookup: {
          from: 'clinicalprofiles',
          localField: 'clinicalProfile',
          foreignField: '_id',
          as: 'cp',
        },
      },
      { $unwind: '$cp' },
      { $match: { 'cp.healthWorkerId': hwObjectId, status } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1,
          patient: 1,
          patientNumber: 1,
          clinicalProfile: 1,
          referralDate: 1,
          scheduledVisitDate: 1,
          status: 1,
          assessments: 1,
          referredBy: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]).exec();

    return results as unknown as IReferral[];
  }
}

export default ReferralService;
