import type { NextFunction, Request, Response } from "express";
import ResponseFactory from "../controller/responseFactory.js";
import BaseError from "./BaseError.js";
import { DUPLICATE_KEY_ERRORS } from "./duplicateKeyMessages.js";

export default class GlobalErrorHandler {
  static getInstance(): GlobalErrorHandler {
    return new GlobalErrorHandler();
  }

  handleError(err: any, req: Request, res: Response, next: NextFunction) {
    const rf = ResponseFactory.getResponseFactory(res);

    // Handle known operational errors
    if (err instanceof BaseError) {
      return this.handleOperationalError(err, req, res, next);
    }

    // Handle Mongoose duplicate key error
    if (err.code === 11000) {
      return this.handleDuplicateKeyError(err, rf);
    }

    // Handle zod validation errors
    if (err.name === "ZodError") {
      console.log("Zod validation error:", err);
      return rf.badRequest("Validation failed", err);
    }

    // non-operational / unknown errors
    return rf.error(err, "Something went wrong", 500);
  }

  handleOperationalError(
    err: BaseError,
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const rf = ResponseFactory.getResponseFactory(res);

    switch (err.statusCode) {
      case 400:
        return rf.badRequest(err.message);
      case 401:
        return rf.unauthenticated(err.message);
      case 403:
        return rf.forbidden();
      case 404:
        return rf.notFound(err.message);
      case 500:
      default:
        return rf.error(err, err.message || "Internal Server Error");
    }
  }

  handleDuplicateKeyError(err: any, rf: ResponseFactory) {
    const kv: string | undefined = Object.keys(err.keyValue)[0];
    const factory = kv ? DUPLICATE_KEY_ERRORS[kv] : undefined;

    const field = Object.keys(err.keyValue)[0];
    const message = factory
      ? factory(err.keyValue).message
      : `Duplicate value for field: ${field}`;
    return rf.badRequest(message);
  }
}
