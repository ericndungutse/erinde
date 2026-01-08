import type { Request, Response, NextFunction } from 'express';
import { RegisterUserSchema } from '../types/register-user.types.js';

export function validateRegisterUser(req: Request, res: Response, next: NextFunction) {
  const result = RegisterUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid request data',
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  next();
}
