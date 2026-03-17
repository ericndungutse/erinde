import BaseError from './BaseError.js';

export default class CommunityHealthUnitNotFoundError extends BaseError {
  constructor(message = 'community_health_unit_not_found') {
    super(message, 404);
  }
}