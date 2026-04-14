import BaseError from "./BaseError.js";

export default class ReferralHospitalMismatchError extends BaseError {
  constructor() {
    const message = "referral_hospital_mismatch";
    super(message, 400);
  }
}
