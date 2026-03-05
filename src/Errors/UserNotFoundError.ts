
import BaseError from "./BaseError.js";

export default class UserNotFoundError extends BaseError {
    readonly locale_key = 'user_not_found';
  constructor(message = "User not found.") {
    super(message, 404);
  }
}
