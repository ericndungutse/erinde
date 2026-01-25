import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import ResponseFactory from '../controller/responseFactory.js';

export const validateBody = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Use reduce to accumulate all errors into one object
      const errorObject = result.error.issues.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>,
      );

      return ResponseFactory.getResponseFactory(res).badRequest('Validation failed', errorObject);
    }

    // Attach validated and transformed data to request
    req.body = result.data;
    next();
  };
};
