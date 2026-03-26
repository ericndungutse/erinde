import BaseError from './BaseError.js';

export default class AssessmentForSameIndicatorTakenTodayError extends BaseError {
  constructor() {
    // Locale Key for the error message
    const message = 'assessment_for_same_indicator_taken_today';

    super(message, 400);
  }
}
