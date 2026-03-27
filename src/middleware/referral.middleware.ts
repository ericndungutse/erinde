import type { NextFunction, Request, Response } from "express";
import HasPendingReferralError from "../Errors/HasPendingReferralError.js";
import { Assessment } from "../models/assessment.model.js";
import Referral from "../models/referral.model.js";
import { logger } from "../logger.js";

export async function checkPendingReferral(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { patientNumber, indicator } = req.body;

  // 1. TRACE: Initial entry point
  logger.trace({ patientNumber, indicator }, "Checking for pending referrals");

  try {
    const referral = await Referral.findOne({
      patientNumber,
      status: "PENDING",
    })
      .lean()
      .exec();

    if (!referral) {
      // 2. DEBUG: Helpful to know the path taken when no referral exists
      logger.debug({ patientNumber }, "No pending referral found; proceeding");
      return next();
    }

    logger.debug(
      {
        referralId: referral._id,
        assessmentCount: referral.assessments.length,
      },
      "Pending referral found; checking assessment indicators",
    );

    // 3. Loop through assessments
    for (const assessmentId of referral.assessments) {
      const assessment = await Assessment.findById(assessmentId)
        .select("indicator")
        .lean()
        .exec();

      if (!assessment) {
        // 4. WARN: Data inconsistency (ID exists in referral list but not in Assessment collection)
        logger.warn(
          { assessmentId, referralId: referral._id },
          "Assessment ID in referral list not found in database",
        );
        continue;
      }

      // 5. If Indicator already is included, reject
      if (assessment.indicator.toString() === indicator) {
        // 6. WARN: This is a business-rule violation (The "Blocked" path)
        logger.warn(
          { patientNumber, referralId: referral._id, indicator },
          "Duplicate referral blocked: Patient already has a pending referral for this indicator",
        );
        return next(new HasPendingReferralError());
      }
    }

    // 7. INFO: Milestone (Allowed to proceed despite having a pending referral for a DIFFERENT indicator)
    logger.info(
      { patientNumber, indicator },
      "Pending referral exists but for a different indicator; allowing new assessment",
    );
    return next();
  } catch (error) {
    // 8. ERROR: System/Database failure
    logger.error(
      { error, patientNumber },
      "Critical error during pending referral check",
    );
    return next(error);
  }
}
