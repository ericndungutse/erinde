import BaseError from './BaseError.js';

export default class ParameterIsRequiredError extends BaseError {
  readonly parameter: string;
  constructor(parameter: string) {
    const message = 'parameter_required';
    super(message, 400);
    this.parameter = parameter;
  }
}
