import BaseError from './BaseError.js';

export default class UnauthenticatedError extends BaseError {
  constructor() {
    const message = 'please_login';
    super(message, 401);
  }
}
