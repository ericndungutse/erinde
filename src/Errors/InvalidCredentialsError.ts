import BaseError from './BaseError.js';

export default class InvalidCredentialsError extends BaseError {
  readonly locale_key = 'invalid_credentials';
  constructor(message = 'Invalid credentials.') {
    super(message, 401);
  }
}
