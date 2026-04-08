import { endOfDay, startOfDay } from "date-fns";
import type { NextFunction, Request, Response } from "express";
import AssessmentForSameIndicatorTakenTodayError from "../Errors/AssessmentForSameIndicatorTakenTodayError.js";
import { logger } from "../logger.js";
import { Assessment } from "../models/assessment.model.js";
import { resolveUserSourceScope } from "./source-scope.middleware.js";

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
  logger.trace(
    {
      userId: req.user?.id,
      roles: req.user?.roles,
    },
    "Resolving assessment source scope from authenticated user",
  );

  const user = req.user;
  if (!user || !user.roles) {
    logger.warn(
      { hasUser: Boolean(user), hasRoles: Boolean(user?.roles) },
      "Unauthorized request: missing user context while resolving assessment source",
    );
    return res
      .status(401)
      .json({ status: "fail", message: "Unauthorized: missing user context" });
  }

  const { fromType: takenFromType, from: takenFrom } =
    resolveUserSourceScope(req);

  logger.debug(
    { userId: user.id, takenFromType, takenFrom },
    "Resolved assessment source scope",
  );

  if (!takenFromType || !takenFrom) {
    logger.warn(
      { userId: user.id, roles: user.roles },
      "Unable to resolve assessment context for authenticated user",
    );
    return res.status(400).json({
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

  logger.info(
    { userId: user.id, takenFromType, takenFrom },
    "Assessment context attached to request",
  );

  next();
}

// Assessment taken twice validation middleware on the same day.
export async function validateAssessmentTakenTwice(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Body Contains patientNumber, indicator
    const { patientNumber, indicator } = req.body;

    logger.trace(
      { patientNumber, indicator },
      "Checking if assessment was already taken today for indicator",
    );

    // Find Asseessment for this user with same indicator and take today's date.
    //TODO VERIFIE DATES.
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
      logger.warn(
        { patientNumber, indicator, assessmentId: assessment._id },
        "Duplicate assessment blocked: same indicator already taken today",
      );
      return next(new AssessmentForSameIndicatorTakenTodayError());
    }

    logger.debug(
      { patientNumber, indicator },
      "No same-day duplicate assessment found; proceeding",
    );

    next();
  } catch (error) {
    logger.error(
      {
        error,
        patientNumber: req.body?.patientNumber,
        indicator: req.body?.indicator,
      },
      "Failed while validating duplicate same-day assessment",
    );
    next(error);
  }
}
