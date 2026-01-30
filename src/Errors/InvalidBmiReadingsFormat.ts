import BaseError from './BaseError.js';

export default class InvalidBmiReadingsFormat extends BaseError {
  constructor(message = 'Invalid BMI readings format. Height(cm) and weight(kg) must be numbers.') {
    super(message, 400);
  }
}
