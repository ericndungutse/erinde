import BaseError from './BaseError.js';

export default class HospitalNotFoundError extends BaseError {
  constructor(message = 'hospital_not_found') {
    super(message, 400);
  }
}
