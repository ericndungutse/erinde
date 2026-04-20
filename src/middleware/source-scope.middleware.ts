import type { NextFunction, Request, Response } from "express";
import { ModelNames } from "../constants/constant.values.js";
import { logger } from "../logger.js";
import { UserRole } from "../types/roles.types.js";

export type SourceScopedFilter = {
  from?: string;
  fromType?: ModelNames.Hospital | ModelNames.CommunityHealthUnit;
  to?: string;
};

/**
 * Shared specification for entities scoped by `from` + `fromType`.
 * This is used to resolve the source scope for referrals based on the authenticated user's roles and assignments.
 * For example:
 * - A nurse assigned to a hospital will have a source scope of `to = hospitalId` to access referrals where the destination is their hospital.
 * - A social health worker assigned to a community health unit will have a source scope of `from = communityHealthUnitId` and `fromType = CommunityHealthUnit` to access referrals originating from their community health unit.
 * - If no specific scope can be resolved, an empty filter is returned, which may result in no data being returned or all data being returned depending on how the service layer handles it.
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

  // Do incoming only for nurses (to get referrals where to = hospitalId). Nurses should not have access to referrals where from = hospitalId since they are not the source of the referral
  if (userRoles.includes(UserRole.NURSE) && req.user?.hospitalId) {
    logger.debug(
      {
        nurseId: req.user.id,
        to: req.user.hospitalId,
      },
      "Resolved source scope for nurse",
    );

    return {
      to: req.user.hospitalId,
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

  // For social health workers, we use the from scope based on their assigned community health unit (if any)
  // View outgoing from our community health unit to hospitals.clinics
  if (
    userRoles.includes(UserRole.SOCIAL_HEALTH_WORKER) &&
    managedCommunityHealthUnitId
  ) {
    logger.debug(
      {
        shwId: req.user?.id,
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
