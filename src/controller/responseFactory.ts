import type { Request, Response } from "express";
import i18next from "i18next";
import { ConstantValues } from "../constants/constant.values.js";

// BaseController.js
export default class ResponseFactory {
  private res: Response;

  constructor(res: Response) {
    this.res = res;
  }

  static getResponseFactory(res: Response): ResponseFactory {
    return new ResponseFactory(res);
  }

  ok(options: { key?: string; data?: any; message?: string }): Response {
    const { key, data, message = "Success" } = options;

    return this.res.status(200).json({
      status: "success",
      message,
      data: key ? { [key]: data } : (data ?? {}),
    });
  }

  created(key: string, data: any, message = "Resource created successfully") {
    const response = {
      status: "success",
      message,
      data: {},
    };

    if (data != null) {
      // includes both null and undefined
      response.data = { [key]: data };
    }

    return this.res.status(201).json(response);
  }

  error(error: any, message = "Unknown Error", status = 500) {
    console.log("******************** ", error?.name);

    console.error(error);

    return this.res.status(status).json({
      status: "error",
      message,
    });
  }

  badRequest(message = "Bad Request", errors?: any) {
    return this.res.status(400).json({
      status: "fail",
      message: i18next.t(message, {
        lng: this.res.req?.language || ConstantValues.DEFAULT_LANGUAGE,
        defaultValue: message,
        parameter: errors?.parameter,
      }),
      errors: errors ? errors : undefined,
    });
  }

  unauthenticated(
    message = "Unauthenticated. Please log in to access this resource.",
  ) {
    return this.res.status(401).json({
      status: "fail",
      message: i18next.t(message, {
        lng: this.res.req?.language || ConstantValues.DEFAULT_LANGUAGE,
        defaultValue: message,
      }),
    });
  }

  forbidden(message = "forbidden_action") {
    return this.res.status(403).json({
      status: "fail",
      message: i18next.t(message, {
        lng: this.res.req?.language || ConstantValues.DEFAULT_LANGUAGE,
        defaultValue: "You do not have permission to perform this action.",
      }),
    });
  }

  notFound(message: string) {
    const defaultMessage =
      "Resource not found. Please check the URL or resource identifier and try again.";
    return this.res.status(404).json({
      status: "fail",
      message: i18next.t(message, {
        lng: this.res.req?.language || ConstantValues.DEFAULT_LANGUAGE,
        defaultValue: defaultMessage,
      }),
    });
  }
}
