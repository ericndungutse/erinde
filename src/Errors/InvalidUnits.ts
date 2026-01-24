import BaseError from './BaseError.js';

export default class InvalidUnit extends BaseError {
  constructor(message = 'Invalid units.') {
    super(message, 400);
  }
}
