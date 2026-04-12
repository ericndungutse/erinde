import BaseError from "./BaseError.js";

export default class ForbiddenError extends BaseError {
  constructor(message = "forbidden_action") {
    super(message, 403);
  }
}
