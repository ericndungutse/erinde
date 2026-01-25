import BaseError from './BaseError.js';

export class AssessmentCreationError extends BaseError {
  constructor(message?: string) {
    super(message ?? 'There was an error creating the assessment! Please try again.', 500);
  }
}
