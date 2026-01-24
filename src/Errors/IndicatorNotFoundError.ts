import BaseError from './BaseError.js';

export default class IndicatorNotFound extends BaseError {
  constructor(message = 'Indicator not found.') {
    super(message, 404);
  }
}
