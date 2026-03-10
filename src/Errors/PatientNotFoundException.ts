import BaseError from './BaseError.js';

export default class PatientNotFoundException extends BaseError {
  constructor(message = 'patient_not_found') {
    super(message, 404);
  }
}
