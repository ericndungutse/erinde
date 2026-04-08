import type { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyToken } from "../security/jwt.utils.js";
import User from "../models/user.model.js";
import type { UserRole } from "../types/roles.types.js";
import { UserRole as UserRoleEnum } from "../types/roles.types.js";
import JwtAuthenticationError from "../Errors/JwtAuthenticationError.js";
import { logger } from "../logger.js";
import type { mainModule } from "node:process";

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    logger.trace(
      {
        method: req.method,
        path: req.originalUrl,
        hasAuthorizationHeader: Boolean(req.headers.authorization),
        hasJwtCookie: Boolean(req.cookies?.jwt),
      },
      "Authenticating incoming request",
    );

    let token;
    // Check for token in Authorization header (Bearer token)
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
      logger.debug(
        { path: req.originalUrl },
        "JWT extracted from Authorization header",
      );
    }

    // Check for token in cookie if not found in header
    if (!token && req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
      logger.debug({ path: req.originalUrl }, "JWT extracted from cookie");
    }

    // If no token found, return 401
    if (!token) {
      logger.warn(
        { method: req.method, path: req.originalUrl },
        "Unauthenticated request: no JWT provided",
      );
      return res.status(401).json({
        status: "fail",
        message: "Unauthenticated. Please log in to access this resource",
      });
    }

    // { id: user._id, email: user.email, roles: user.roles }
    // Verify the token
    const decoded = verifyToken(token);

    logger.debug(
      { subject: decoded.sub, path: req.originalUrl },
      "JWT verified successfully",
    );

    // Check if user still exists in database
    const user = await User.findById(decoded.sub);

    if (!user) {
      logger.warn(
        { subject: decoded.sub, path: req.originalUrl },
        "Unauthenticated request: user from token not found",
      );
      return res.status(401).json({
        status: "fail",
        message: "Unauthenticated. User not found.",
      });
    }

    // Attach the authenticated user context used by controllers/services.
    req.user = {
      id: user.id,
      roles: user.roles,
      hospitalId: user.roles.includes(UserRoleEnum.NURSE)
        ? decoded.hospitalId
        : undefined,
      communityHealthUnit: user.communityHealthUnit,
      managedCommunityHealthUnit: {
        id: decoded.managedCommunityHealthUnit?.id,
        name: decoded.managedCommunityHealthUnit?.name,
      },
    };

    logger.info(
      {
        userId: user.id,
        roles: user.roles,
        hospitalId: req.user.hospitalId,
        managedCommunityHealthUnit: req.user.managedCommunityHealthUnit,
      },
      "Request authenticated and user context attached",
    );

    next();
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError ||
      (error instanceof Error && error.message === "Invalid token payload")
    ) {
      logger.warn(
        {
          method: req.method,
          path: req.originalUrl,
          errorName: error.name,
          message: error.message,
        },
        "JWT authentication failed due to invalid/expired token",
      );
      return next(new JwtAuthenticationError());
    }

    logger.error(
      { error, method: req.method, path: req.originalUrl },
      "Unexpected error in authentication middleware",
    );

    next(error);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthenticated. Please log in to access this resource",
      });
    }

    if (
      req.user.roles &&
      !roles.some((role) => req.user && req.user.roles.includes(role))
    ) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
};
