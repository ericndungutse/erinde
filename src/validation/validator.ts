import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import ResponseFactory from '../controller/responseFactory.js';

export const validateBody = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((err: any) => ({
        [err.path[0]]: err.message,
      }));

      return ResponseFactory.getResponseFactory(res).badRequest('Validation failed', errors);
    }

    // Attach validated data to request
    req.body = result.data;
    next();
  };
};
