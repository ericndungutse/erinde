import type { Request, Response } from 'express';

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
    const { key, data, message = 'Success' } = options;

    return this.res.status(200).json({
      status: 'success',
      message,
      data: key ? { [key]: data } : (data ?? {}),
    });
  }

  created(key: string, data: any, message = 'Resource created successfully') {
    const response = {
      status: 'success',
      message,
      data: {},
    };

    if (data != null) {
      // includes both null and undefined
      response.data = { [key]: data };
    }

    return this.res.status(201).json(response);
  }

  error(error: any, message = 'Unknown Error', status = 500) {
    console.log('******************** ', error?.name);

    console.error(error);

    return this.res.status(status).json({
      status: 'error',
      message,
    });
  }

  badRequest(message = 'Bad Request', errors?: any) {
    return this.res.status(400).json({
      status: 'fail',
      message,
      errors: errors ? errors : undefined,
    });
  }

  unauthenticated(message = 'Unauthenticated. Please log in to access this resource.') {
    return this.res.status(401).json({
      status: 'fail',
      message,
    });
  }

  forbidden() {
    return this.res.status(403).json({
      status: 'fail',
      message: 'You do not have permission to perform this action.',
    });
  }

  notFound(message = 'Resource not found') {
    return this.res.status(404).json({
      status: 'fail',
      message,
    });
  }
}
