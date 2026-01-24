import BaseError from './BaseError.js';

export default class HasPendingReferralError extends BaseError {
  constructor(
    message = 'Patient has a pending referral with this indicator assessment already included. Please resolve the current referral before initiating a new one.',
  ) {
    super(message, 400);
  }
}
