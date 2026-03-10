
import BaseError from "./BaseError.js";

export default class UserNotFoundError extends BaseError {
  constructor(message = "user_not_found") {
    super(message, 404);
  }
}
