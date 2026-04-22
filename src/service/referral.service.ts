import mongoose, { type ClientSession } from "mongoose";
import { Assessment } from "../models/assessment.model.js";
import ClinicalProfile from "../models/clinicalProfile.model.js";
import Referral, { type IReferralDocument } from "../models/referral.model.js";
import type { IReferralService } from "./interface/ireferral.service.js";

import { addHours, endOfDay, startOfDay } from "date-fns";
import type { IReferral } from "../domain/referral.js";
import type {
  IReferralDetails,
  IReferralMetricsSummary,
  IReferralSummary,
} from "../dto/referral.dto.js";
import { logger } from "../logger.js";
import type { PaginationMeta } from "../types/api.types.js";
import type { Populate, project } from "../types/populate.types.js";
import { APIFeatures } from "../utils/apiFeatures.js";
import { convertToKigaliTime } from "../utils/date.js";
import { MongoQueryUtils } from "../utils/mongo.query.utils.js";

export class ReferralService implements IReferralService {
  private getTodayBounds(): { startOfToday: Date; endOfToday: Date } {
    // Server time now: Ensure if on a remote server, we are calculating Kigali day bounds based on current server time converted to Kigali timezone
    const now = convertToKigaliTime(new Date());
    return {
      startOfToday: startOfDay(now),
      endOfToday: endOfDay(now),
    };
  }

  private async countReferrals(
    filter: Record<string, unknown> = {},
  ): Promise<number> {
    const resolvedFilter: Record<string, unknown> = { ...filter };

    for (const key of ["from", "referredBy", "to", "userId"]) {
      if (typeof resolvedFilter[key] === "string") {
        resolvedFilter[key] = new mongoose.Types.ObjectId(
          resolvedFilter[key] as string,
        );
      }
    }

    return Referral.countDocuments(resolvedFilter).exec();
  }

  async countTotalReferrals(
    filter: Record<string, unknown> = {},
  ): Promise<number> {
    return this.countReferrals(filter);
  }

  async countPendingReferrals(
    filter: Record<string, unknown> = {},
  ): Promise<number> {
    const { startOfToday } = this.getTodayBounds();
    logger.info(
      `Getting count of pending referrals with scheduledVisitDate >= ${startOfToday} and filter: ${JSON.stringify(filter)}`,
    );
    const count = await this.countReferrals({
      ...filter,
      status: "PENDING",
      scheduledVisitDate: { $gte: startOfToday },
    });
    logger.info(
      `Counted ${count} pending referrals with scheduledVisitDate >= ${startOfToday} and filter: ${JSON.stringify(filter)}`,
    );
    return count;
  }

  async countScheduledTodayReferrals(
    filter: Record<string, unknown> = {},
  ): Promise<number> {
    const { startOfToday, endOfToday } = this.getTodayBounds();

    logger.info(
      `Getting count of referrals scheduled for today from ${startOfToday} to ${endOfToday} with filter: ${JSON.stringify(filter)}`,
    );

    logger.info(
      `Mongodb Converting startOfToday to ${startOfToday.toISOString()}`,
    );
    logger.info(`Mongodb Converting endOfToday to ${endOfToday.toISOString()}`);

    const count = await this.countReferrals({
      ...filter,
      scheduledVisitDate: {
        $gte: startOfToday,
        $lt: endOfToday,
      },
    });

    logger.info(
      `Counted ${count} referrals scheduled for today with filter: ${JSON.stringify(filter)}`,
    );

    return count;
  }

  // TODO ADD COMPLETED AT FIELD TO REFERRAL TO MAKE THIS MORE ACCURATE
  async countCompletedTodayReferrals(
    filter: Record<string, unknown> = {},
  ): Promise<number> {
    const { startOfToday, endOfToday } = this.getTodayBounds();

    logger.info(
      `Getting count of completed referrals today from ${startOfToday} to ${endOfToday} with filter: ${JSON.stringify(filter)}`,
    );

    const count = await this.countReferrals({
      ...filter,
      status: "COMPLETED",
      updatedAt: {
        $gte: startOfToday,
        $lt: endOfToday,
      },
    });

    logger.info(
      `Counted ${count} completed referrals for today with filter: ${JSON.stringify(filter)}`,
    );

    return count;
  }

  async countOverdueReferrals(
    filter: Record<string, unknown> = {},
  ): Promise<number> {
    const { startOfToday } = this.getTodayBounds();

    logger.info(
      `Getting count of overdue referrals with scheduledVisitDate before ${startOfToday} and filter: ${JSON.stringify(filter)}`,
    );

    const count = await this.countReferrals({
      ...filter,
      status: "PENDING",
      scheduledVisitDate: {
        $lt: startOfToday,
      },
    });

    logger.info(
      `Counted ${count} overdue referrals with scheduledVisitDate before ${startOfToday} and filter: ${JSON.stringify(filter)}`,
    );

    return count;
  }

  async getReferralMetrics(
    filter: Record<string, unknown> = {},
  ): Promise<IReferralMetricsSummary> {
    const [total, pending, scheduledToday, completedToday, overdue] =
      await Promise.all([
        this.countTotalReferrals(filter),
        this.countPendingReferrals(filter),
        this.countScheduledTodayReferrals(filter),
        this.countCompletedTodayReferrals(filter),
        this.countOverdueReferrals(filter),
      ]);

    return {
      total,
      pending,
      scheduled_today: scheduledToday,
      completed_today: completedToday,
      overdue,
    };
  }

  async getReferral(
    filter: any,
    session?: ClientSession,
    select?: project,
    populate?: Populate,
  ): Promise<IReferralDetails | null> {
    // 1. Initialize the query

    let query = Referral.findOne({
      ...filter,
      status: filter.status ?? "PENDING",
    }).session(session ?? null);

    // 2. Apply Projection (Select)
    if (select && Object.keys(select).length > 0) {
      query = MongoQueryUtils.applySelect(query, select);
    }

    // // 3. Apply Population logic
    if (populate && Object.keys(populate).length > 0) {
      query = MongoQueryUtils.applyPopulate(query, populate);
    }

    // 4. Execute
    const referral = await query.lean().exec();

    return referral as IReferralDetails | null;
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
    userId: string,
    referredBy: string,
    from: string,
    fromType: string,
    to: string,
    existingPendingReferral?: IReferralDocument | null,
    session?: ClientSession,
  ): Promise<void> {
    const now: Date = new Date();

    // if existingPendingReferral is provided, append assessment to its assessments list and save
    if (existingPendingReferral) {
      if (!existingPendingReferral.assessments.includes(assessmentId)) {
        existingPendingReferral.assessments.push(assessmentId);
        await existingPendingReferral.save({ session: session ?? null });

        // Append to existing referral and return
        return;
      }
    }

    // 2. Fetch assessment and clinical profile (transaction-aware)
    const [assessment, clinicalProfile] = await Promise.all([
      Assessment.findById(assessmentId)
        .session(session ?? null)
        .lean()
        .exec(),
      ClinicalProfile.findOne({ userId: userId })
        .session(session ?? null)
        .lean()
        .exec(),
    ]);

    if (!assessment || !clinicalProfile) {
      throw new Error("Required Assessment or Clinical Profile not found");
    }

    // 3. Schedule next visit
    const scheduledVisitDate = new Date(now);
    scheduledVisitDate.setDate(scheduledVisitDate.getDate() + 30);

    // 4. Create referral (transaction-aware)
    await Referral.create(
      [
        {
          userId,
          patientNumber: clinicalProfile.patientNumber,
          referralDate: now,
          scheduledVisitDate,
          status: "PENDING",
          assessments: [assessmentId],
          from,
          fromType,
          referredBy,
          to,
        },
      ],
      { session: session ?? null },
    );
  }

  /**
   * Return single referral details by id (no population).
   */
  async getReferralById(referralId: string): Promise<IReferralDetails | null> {
    const doc = await Referral.findById(referralId)
      .select({
        patient: 1,
        patientNumber: 1,
        hospitalId: 1,
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

    const details: any = {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      patientNumber: doc.patientNumber,
      to: doc.to.toString(),
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

  // Get all referrals with optional filtering, sorting, field limiting, and pagination.
  async getAllReferrals(
    query: Record<string, string | string[] | undefined> = {},
    filter?: {},
  ): Promise<any> {
    logger.debug(
      { query, filter },
      "Getting all referrals with query and filter",
    );
    const features = new APIFeatures(Referral.find(filter), query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // Count documents matching the same filter
    const countFeatures = new APIFeatures(
      Referral.find(filter),
      query,
    ).filter();
    const filteredQuery = countFeatures.query.getFilter() as any;
    const totalResults = await Referral.countDocuments(filteredQuery).exec();

    const page = features.page ?? 1;
    const limit = features.limit ?? 20;
    const totalPages = Math.max(1, Math.ceil(totalResults / limit));
    const currentPage = Math.min(page, totalPages);

    // Ensure we keep our hospital projection consistent.
    const referrals = (await features.query
      .select("-__v -createdAt -updatedAt")
      .lean()
      .exec()) as unknown as IReferral[];

    const pagination: PaginationMeta = {
      currentPage,
      perPage: limit,
      totalResults,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
      prevPage: currentPage > 1 ? currentPage - 1 : null,
    };

    return { referrals, pagination };
  }

  async getCommingReferralVisitsIn48h(
    filter: { from?: string; fromType?: string; status?: string } = {},
  ): Promise<IReferralSummary[]> {
    // Server time
    const now = convertToKigaliTime(new Date());
    const next48h = addHours(now, 48);

    logger.info(
      `Getting upcoming referral visits in 48 hours from ${now} up to ${next48h}`,
    );

    const resolvedFilter: any = {
      from: new mongoose.Types.ObjectId(filter.from),
      fromType: filter.fromType,
      scheduledVisitDate: {
        $gte: now,
        $lte: next48h,
      },
      status: filter.status ? filter.status : "PENDING",
    };

    const referrals = await Referral.find(resolvedFilter)
      .sort({ scheduledVisitDate: 1 })
      .lean();

    return referrals.map((r) => ({
      id: r._id.toString(),
      patientNumber: r.patientNumber,
      referralDate: r.referralDate,
      scheduledVisitDate: r.scheduledVisitDate,
      status: r.status,
      assessmentCount: r.assessments?.length || 0,
    }));
  }
}

export default ReferralService;
