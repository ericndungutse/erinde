import BaseError from './BaseError.js';

export default class JwtAuthenticationError extends BaseError {
  constructor() {
    const message = 'please_login';

    super(message, 401);
  }
}
