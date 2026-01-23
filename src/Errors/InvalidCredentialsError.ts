import BaseError from './BaseError.js';

export default class InvalidCredentialsError extends BaseError {
  constructor(message = 'Invalid credentials.') {
    super(message, 401);
  }
}
