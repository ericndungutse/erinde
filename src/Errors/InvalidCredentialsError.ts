import BaseError from './BaseError.js';

export default class InvalidCredentialsError extends BaseError {
  constructor() {
    const message = 'invalid_credentials';
    super(message, 401);
  }
}
