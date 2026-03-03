abstract class BaseError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean = true;
  readonly locale_key: string = '';

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default BaseError;
