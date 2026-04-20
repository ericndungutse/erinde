import BaseError from "./BaseError.js";

export default class ReferralNotFoundForPatientNumber extends BaseError {
  constructor(message = "referral_not_found_for_patient_number") {
    super(message, 404);
  }
}
