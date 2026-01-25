import BaseError from './BaseError.js';

export default class DuplicatePhoneError extends BaseError {
  constructor(message = 'A user already exists with the provided phone number') {
    super(message, 400);
  }
}
