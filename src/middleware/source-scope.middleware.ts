import type { NextFunction, Request, Response } from "express";
import { ModelNames } from "../constants/constant.values.js";
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

  if (userRoles.includes(UserRole.NURSE) && req.user?.hospitalId) {
    return {
      from: req.user.hospitalId,
      fromType: ModelNames.Hospital,
    };
  }

  const managedCommunityHealthUnitId = req.user?.managedCommunityHealthUnit?.id;

  if (
    userRoles.includes(UserRole.SOCIAL_HEALTH_WORKER) &&
    managedCommunityHealthUnitId
  ) {
    return {
      from: managedCommunityHealthUnitId,
      fromType: ModelNames.CommunityHealthUnit,
    };
  }

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
