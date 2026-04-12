import type { NextFunction, Request, Response } from "express";
import ParameterIsRequiredError from "../Errors/ParameterIsRequiredError.js";
import { logger } from "../logger.js";

export type NurseEncounterContext = {
  initiatorId: string;
  hospitalId: string;
};

/**
 * Extract and validate nurse encounter context from authenticated user.
 * Assumes caller is authenticated (protect) and authorized as NURSE (authorize).
 * Simply validates that initiatorId and hospitalId are present and attaches to req.
 */
export function resolveNurseEncounterContext(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const user = req.user;

  logger.trace(
    {
      userId: user?.id,
      hospitalId: user?.hospitalId,
    },
    "Resolving nurse encounter context from authenticated user",
  );

  if (!user?.id) {
    return next(new ParameterIsRequiredError("initiatorId"));
  }

  if (!user.hospitalId) {
    logger.warn(
      {
        userId: user.id,
        hasHospitalId: Boolean(user.hospitalId),
      },
      "Unable to resolve nurse encounter context",
    );

    return next(new ParameterIsRequiredError("hospitalId"));
  }

  req.nurseEncounterContext = {
    initiatorId: user.id,
    hospitalId: user.hospitalId,
  };

  next();
}
