import BaseError from './BaseError.js';

export default class DuplicateIDError extends BaseError {
  constructor(message = 'A user already exists with the provided national identification number') {
    super(message, 400);
  }
}
