import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import ResponseFactory from "../controller/responseFactory.js";
import i18next from "../i18n.js";
import { ConstantValues } from "../constants/constant.values.js";

export const validateBody = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    let errorObject: Record<string, string> = {};
    if (!result.success) {
      if (result.error.issues[0]?.code === "invalid_union") {
        result.error.issues[0].errors.forEach((zodError) => {
          zodError.forEach((err) => {
            const path = err.path.join(".");
            errorObject[path] = i18next.t(err.message, {
              defaultValue: err.message,
              field: err.path[0],
              lng: req.language || ConstantValues.DEFAULT_LANGUAGE,
            });
          });
        });
      } else {
        errorObject = result.error.issues.reduce(
          (acc, err) => {
            const path = err.path.join(".");
            acc[path] = i18next.t(err.message, {
              defaultValue: err.message,
              field: err.path[0],
              lng: req.language || ConstantValues.DEFAULT_LANGUAGE,
            });
            return acc;
          },
          {} as Record<string, string>,
        );
      }

      return ResponseFactory.getResponseFactory(res).badRequest(
        "Validation failed",
        errorObject,
      );
    }

    // Attach validated and transformed data to request
    req.body = result.data;
    next();
  };
};
