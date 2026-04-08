import type { NextFunction, Request, Response } from "express";
import { ModelNames } from "../constants/constant.values.js";
import { logger } from "../logger.js";
import { UserRole } from "../types/roles.types.js";

export type SourceScopedFilter = {
  from?: string;
  fromType?: ModelNames.Hospital | ModelNames.CommunityHealthUnit;
};

/**
 * Shared specification for entities scoped by `from` + `fromType`.
 */
export function resolveUserSourceScope(req: Request): SourceScopedFilter {
  const userRoles = req.user?.roles || [];

  logger.trace(
    {
      userId: req.user?.id,
      roles: userRoles,
      hasHospitalId: req.user?.hospitalId,
      managedCommunityHealthUnit: req.user?.managedCommunityHealthUnit?.id,
    },
    "Resolving source scope from authenticated user",
  );

  if (userRoles.includes(UserRole.NURSE) && req.user?.hospitalId) {
    logger.debug(
      {
        userId: req.user.id,
        from: req.user.hospitalId,
        fromType: ModelNames.Hospital,
      },
      "Resolved source scope for nurse",
    );

    return {
      from: req.user.hospitalId,
      fromType: ModelNames.Hospital,
    };
  }

  const managedCommunityHealthUnitId = req.user?.managedCommunityHealthUnit;

  logger.trace(
    {
      userId: req.user?.id,
      managedCommunityHealthUnitId,
    },
    "Checking for managed community health unit for user",
  );

  if (
    userRoles.includes(UserRole.SOCIAL_HEALTH_WORKER) &&
    managedCommunityHealthUnitId
  ) {
    logger.debug(
      {
        userId: req.user?.id,
        from: managedCommunityHealthUnitId,
        fromType: ModelNames.CommunityHealthUnit,
      },
      "Resolved source scope for social health worker",
    );

    return {
      from: managedCommunityHealthUnitId.id,
      fromType: ModelNames.CommunityHealthUnit,
    };
  }

  logger.warn(
    { userId: req.user?.id, roles: userRoles },
    "No source scope could be resolved for user",
  );

  return {};
}

export function createResolveEntitySourceFilter(requestProperty: string) {
  return function resolveEntitySourceFilter(
    req: Request,
    _res: Response,
    next: NextFunction,
  ) {
    (req as Request & Record<string, unknown>)[requestProperty] =
      resolveUserSourceScope(req);
    next();
  };
}
