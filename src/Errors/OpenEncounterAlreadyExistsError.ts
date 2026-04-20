import BaseError from "./BaseError.js";

export default class OpenEncounterAlreadyExistsError extends BaseError {
  constructor(message = "open_encounter_already_exists") {
    super(message, 400);
  }
}
