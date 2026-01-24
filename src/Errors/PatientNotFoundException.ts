import BaseError from './BaseError.js';

export default class PatientNotFoundException extends BaseError {
  constructor(message = 'Patient not found.') {
    super(message, 404);
  }
}
