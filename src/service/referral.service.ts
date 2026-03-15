import ClinicalProfile from '../models/clinicalProfile.model.js';
import { Assessment } from '../models/assessment.model.js';
import Referral from '../models/referral.model.js';
import mongoose, { Types, type ClientSession } from 'mongoose';
import type { IReferralService } from './interface/ireferral.service.js';

import HasPendingReferralError from '../Errors/HasPendingReferralError.js';
import type { IReferral } from '../domain/referral.js';
import type { IReferralDetails, IReferralStatusSummary, IReferralSummary } from '../dto/referral.dto.js';
import type { ReferralStatus } from '../types/ReferralStatus.types.js';

export class ReferralService implements IReferralService {
  getPendingReferralByPatientNumber(patientNumber: number, session: ClientSession): Promise<IReferral | null> {
    const referral = Referral.findOne({ patientNumber, status: 'PENDING' }).session(session).lean().exec();
    return referral;
  }

  async hasPendingReferral(patientNumber: number): Promise<boolean> {
    const exists = await Referral.exists({
      patientNumber,
      status: 'PENDING',
    });
    return !!exists;
  }

  // TODO: Analytics: You can now calculate the "Lag Time" between scheduledVisitDate and actualVisitDate to see if patients are arriving earlier or later than expected.
  async completeReferralByPatientNumber(patientNumber: number): Promise<any | null> {
    const updated = await Referral.findOneAndUpdate(
      {
        patientNumber,
        status: 'PENDING',
      },
      {
        $set: {
          status: 'COMPLETED',
          visitDate: new Date(),
        },
      },
      {
        new: true,
        sort: { createdAt: -1 },
      },
    )
      .populate('patient')
      .exec();

    return updated;
  }
  /**
   * Create or update a daily referral for a patient based on
   * a single assessment.
   *
   * One referral per patient per day:
   * - If a referral for (patient, referralDate) exists, append the assessment id.
   * - Otherwise create a new referral.
   */

  async createReferral(
    assessmentId: string,
    patientId: string,
    hospitalId: String,
    referredBy: string,
    session?: ClientSession,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Check for existing PENDING referral (transaction-aware)
    // Check if there is a pending referral for the patient
    const existingReferral = await Referral.findOne({
      patient: patientId,
      status: 'PENDING',
    })
      .session(session ?? null)
      .exec();

    if (existingReferral) {
      // Ensure assessments are added for the same day as referral was created.
      if (!this.isSameDay(today, new Date(existingReferral.referralDate))) {
        throw new HasPendingReferralError();
      }

      // Add assessment if not already included
      if (!existingReferral.assessments.includes(assessmentId)) {
        existingReferral.assessments.push(assessmentId);
        await existingReferral.save({ session: session ?? null });
      }
      return;
    }

    // 2. Fetch assessment and clinical profile (transaction-aware)
    const [assessment, clinicalProfile] = await Promise.all([
      Assessment.findById(assessmentId)
        .session(session ?? null)
        .lean()
        .exec(),
      ClinicalProfile.findOne({ userId: patientId })
        .session(session ?? null)
        .lean()
        .exec(),
    ]);

    if (!assessment || !clinicalProfile) {
      throw new Error('Required Assessment or Clinical Profile not found');
    }

    // 3. Schedule next visit
    const scheduledVisitDate = new Date(today);
    scheduledVisitDate.setDate(scheduledVisitDate.getDate() + 30);

    // 4. Create referral (transaction-aware)

    await Referral.create(
      [
        {
          patient: patientId,
          patientNumber: clinicalProfile.patientNumber,
          clinicalProfile: clinicalProfile._id,
          referralDate: today,
          hospitalId: hospitalId as string,
          scheduledVisitDate,
          status: 'PENDING',
          assessments: [assessmentId],
          referredBy,
        },
      ],
      { session: session ?? null },
    );
  }

  /**
   * List referrals for patients under the given social health worker's follow-up.
   * Uses ClinicalProfile.healthWorkerId to determine patient assignment.
   * Returns most recent first.
   */
  async listReferralsByHealthWorker(
    healthWorkerId: string,
    status: ReferralStatus = 'PENDING',
  ): Promise<IReferralSummary[]> {
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
      { $match: { 'cp.healthWorkerId': hwObjectId } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1,
          patientNumber: 1,
          referralDate: 1,
          scheduledVisitDate: 1,
          status: 1,
          assessmentCount: { $size: '$assessments' },
        },
      },
    ]).exec();

    // Map _id to id for DTO shape
    const summaries: IReferralSummary[] = results.map((r: any) => ({
      id: r._id.toString(),
      patientNumber: r.patientNumber,
      referralDate: r.referralDate,
      scheduledVisitDate: r.scheduledVisitDate,
      status: r.status,
      assessmentCount: r.assessmentCount,
    }));

    return summaries;
  }

  /**
   * List referrals scoped to a specific hospital.
   * Returns most recent first.
   */
  async listReferralsByHospital(hospitalId: string): Promise<IReferralSummary[]> {
    const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);

    const results = await Referral.find({ hospitalId: hospitalObjectId })
      .sort({ createdAt: -1 })
      .select({
        _id: 1,
        patientNumber: 1,
        referralDate: 1,
        scheduledVisitDate: 1,
        status: 1,
        assessments: 1,
      })
      .lean()
      .exec();

    const summaries: IReferralSummary[] = results.map((r: any) => ({
      id: r._id.toString(),
      patientNumber: r.patientNumber,
      referralDate: r.referralDate,
      scheduledVisitDate: r.scheduledVisitDate,
      status: r.status,
      assessmentCount: Array.isArray(r.assessments) ? r.assessments.length : 0,
    }));

    return summaries;
  }

  /**
   * List upcoming referrals (today and future) for patients under the given
   * social health worker's follow-up, ordered by scheduledVisitDate ascending.
   */
  async listUpcomingReferralsByHealthWorker(healthWorkerId: string): Promise<IReferralSummary[]> {
    const hwObjectId = new mongoose.Types.ObjectId(healthWorkerId);

    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

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
      {
        $match: {
          'cp.healthWorkerId': hwObjectId,
          status: 'PENDING',
          scheduledVisitDate: { $gte: now, $lte: in48Hours },
        },
      },
      { $sort: { scheduledVisitDate: 1, createdAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 1,
          patientNumber: 1,
          referralDate: 1,
          scheduledVisitDate: 1,
          status: 1,
          assessmentCount: { $size: '$assessments' },
        },
      },
    ]).exec();

    const summaries: IReferralSummary[] = results.map((r: any) => ({
      id: r._id.toString(),
      patientNumber: r.patientNumber,
      referralDate: r.referralDate,
      scheduledVisitDate: r.scheduledVisitDate,
      status: r.status,
      assessmentCount: r.assessmentCount,
    }));

    return summaries;
  }

  /**
   * Return the total number of PENDING referrals for patients assigned to
   * the given social health worker.
   */
  async countPendingReferralsByHealthWorker(healthWorkerId: string): Promise<number> {
    const hwObjectId = new mongoose.Types.ObjectId(healthWorkerId);

    const result = await Referral.aggregate([
      {
        $lookup: {
          from: 'clinicalprofiles',
          localField: 'clinicalProfile',
          foreignField: '_id',
          as: 'cp',
        },
      },
      { $unwind: '$cp' },
      {
        $match: {
          'cp.healthWorkerId': hwObjectId,
          status: 'PENDING',
        },
      },
      { $count: 'count' },
    ]).exec();

    if (!result || result.length === 0) {
      return 0;
    }

    return result[0].count as number;
  }

  /**
   * Compute referral status overview for patients assigned to a given
   * social health worker: pending, completed this month, and overdue.
   */
  async getReferralStatusOverviewByHealthWorker(healthWorkerId: string): Promise<IReferralStatusSummary> {
    const hwObjectId = new mongoose.Types.ObjectId(healthWorkerId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const [result] = await Referral.aggregate([
      {
        $lookup: {
          from: 'clinicalprofiles',
          localField: 'clinicalProfile',
          foreignField: '_id',
          as: 'cp',
        },
      },
      { $unwind: '$cp' },
      {
        $match: {
          'cp.healthWorkerId': hwObjectId,
        },
      },
      {
        $facet: {
          pending: [{ $match: { status: 'PENDING' } }, { $count: 'count' }],
          completed_this_month: [
            {
              $match: {
                status: 'COMPLETED',
                visitDate: { $gte: startOfMonth, $lt: startOfNextMonth },
              },
            },
            { $count: 'count' },
          ],
          overdue: [
            {
              $match: {
                status: 'PENDING',
                scheduledVisitDate: { $lt: today },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]).exec();

    const summary: IReferralStatusSummary = {
      pending: result?.pending?.[0]?.count ?? 0,
      completed_this_month: result?.completed_this_month?.[0]?.count ?? 0,
      overdue: result?.overdue?.[0]?.count ?? 0,
    };

    return summary;
  }

  /**
   * Return single referral details by id (no population).
   */
  async getReferralById(referralId: string): Promise<IReferralDetails | null> {
    const doc = await Referral.findById(referralId)
      .select({
        patient: 1,
        patientNumber: 1,
        clinicalProfile: 1,
        referralDate: 1,
        scheduledVisitDate: 1,
        visitDate: 1,
        status: 1,
        assessments: 1,
        referredBy: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .lean()
      .exec();

    if (!doc) return null;

    const details: IReferralDetails = {
      id: doc._id.toString(),
      patient: doc.patient.toString(),
      patientNumber: doc.patientNumber,
      clinicalProfile: doc.clinicalProfile.toString(),
      referralDate: doc.referralDate as any,
      scheduledVisitDate: doc.scheduledVisitDate as any,
      status: doc.status,
      assessments: (doc.assessments as any[]).map((a) => a.toString()),
      referredBy: doc.referredBy.toString(),
      createdAt: doc.createdAt as Date,
      updatedAt: doc.updatedAt as Date,
      visitDate: doc.visitDate as Date,
    };

    return details;
  }

  isSameDay(dateA: Date, dateB: Date): boolean {
    console.log(dateA, dateB);
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  }
}

export default ReferralService;
