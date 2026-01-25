import BaseError from './BaseError.js';

export default class DuplicateEmailError extends BaseError {
  constructor(message = 'A user already exists with the provided email') {
    super(message, 400);
  }
}
