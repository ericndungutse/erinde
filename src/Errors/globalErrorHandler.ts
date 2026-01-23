import type { NextFunction, Request, Response } from 'express';
import ResponseFactory from '../controller/responseFactory.js';
import BaseError from './BaseError.js';

export default class GlobalErrorHandler {
  static getInstance(): GlobalErrorHandler {
    return new GlobalErrorHandler();
  }

  handleError(err: any, req: Request, res: Response, next: NextFunction) {
    const rf = ResponseFactory.getResponseFactory(res);
    if (err instanceof BaseError) {
      switch (err.statusCode) {
        case 401:
          return rf.unauthenticated(err.message);
        case 403:
          return rf.forbidden();
        case 404:
          return rf.notFound(err.message);
        case 500:
        default:
          return rf.error(err, err.message || 'Internal Server Error');
      }
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      const message = `Duplicate value ${field}`;
      return rf.badRequest(message);
    }

    // non-operational / unknown errors
    return rf.error(err, 'Something went wrong', 500);
  }
}
