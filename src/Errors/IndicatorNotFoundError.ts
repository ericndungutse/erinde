import BaseError from './BaseError.js';

export default class IndicatorNotFound extends BaseError {
  constructor(message = 'indicator_not_found') {
    super(message, 404);
  }
}
