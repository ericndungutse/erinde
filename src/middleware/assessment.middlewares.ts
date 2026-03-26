import type { Request, Response, NextFunction } from "express";
import { ModelNames } from "../constants/constant.values.js";
import { UserRole } from "../types/roles.types.js";
import { Assessment } from "../models/assessment.model.js";
import AssessmentForSameIndicatorTakenTodayError from "../Errors/AssessmentForSameIndicatorTakenTodayError.js";
import { endOfDay, startOfDay } from "date-fns";

/**
 * Middleware to resolve takenFrom and takenFromType for assessment creation.
 * - If user is SOCIAL_HEALTH_WORKER, takenFromType = CommunityHealthUnit, takenFrom = communityHealthUnit
 * - If user is NURSE, takenFromType = Hospital, takenFrom = hospitalId
 * Sets req.assessmentContext = { takenFromType, takenFrom }
 */
export function resolveAssessmentTakenFrom(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user || !user.roles) {
    return res
      .status(401)
      .json({ status: "fail", message: "Unauthorized: missing user context" });
  }

  let takenFromType: ModelNames | undefined;
  let takenFrom: string | undefined;

  if (user.roles.includes(UserRole.SOCIAL_HEALTH_WORKER)) {
    takenFromType = ModelNames.CommunityHealthUnit;
    takenFrom = user.communityHealthUnit.toString();
  } else if (user.roles.includes(UserRole.NURSE)) {
    takenFromType = ModelNames.Hospital;
    takenFrom = user.hospitalId;
  }

  if (!takenFromType || !takenFrom) {
    return res
      .status(400)
      .json({
        status: "fail",
        message: "Unable to resolve assessment context for user",
      });
  }

  // Attach to request for downstream use
  req.body = {
    ...req.body,
    takenFromType,
    takenFrom,
  };
  next();
}

// Assessment taken twice validation middleware on the same day.
export async function validateAssessmentTakenTwice(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Body Contains patientNumber, indicator
  const { patientNumber, indicator } = req.body;

  // Find Asseessment for this user with same indicator and take today's date.
  const evaluatedAtQuery = {
    $gte: startOfDay(new Date()),
    $lt: endOfDay(new Date()),
  };

  const assessment = await Assessment.findOne({
    patientNumber: patientNumber,
    indicator,
    evaluatedAt: {
      ...evaluatedAtQuery,
    },
  });

  if (assessment) {
    return next(new AssessmentForSameIndicatorTakenTodayError());
  }
  next();
}
