import type { Response, Request, NextFunction } from 'express';
import { verifyToken } from '../security/jwt.utils.js';
import User from '../models/user.model.js';
import type { UserRole } from '../types/roles.types.js';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;
    // Check for token in Authorization header (Bearer token)
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Check for token in cookie if not found in header
    if (!token && req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    // If no token found, return 401
    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'Unauthenticated. Please log in to access this resource',
      });
    }

    // { id: user._id, email: user.email, roles: user.roles }
    // Verify the token
    const decoded = verifyToken(token);

    // Check if user still exists in database
    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Unauthenticated. User not found.',
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return;
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Unauthenticated. Please log in to access this resource',
      });
    }

    if (req.user.roles && !roles.some((role) => req.user && req.user.roles.includes(role))) {
      return res.status(403).json({ status: 'fail', message: 'You do not have permission to perform this action.' });
    }
    next();
  };
};
