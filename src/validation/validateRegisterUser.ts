import type { Request, Response, NextFunction } from 'express';
import { RegisterUserSchema, RegisterUserWithAccountSchema } from '../dto/user.dto.js';

export function validateRegisterUser(req: Request, res: Response, next: NextFunction) {
  const result = RegisterUserSchema.safeParse(req.body);
  if (!result.success) {
    console.log(result.error);
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

export function validateRegisterUserWithAccount(req: Request, res: Response, next: NextFunction) {
  const result = RegisterUserWithAccountSchema.safeParse(req.body);
  if (!result.success) {
    // Inside your error formatter
    console.log(result.error);
    const formattedErrors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid request data',
      errors: formattedErrors,
    });
  }
  next();
}
