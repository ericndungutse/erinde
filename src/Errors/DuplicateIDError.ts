import i18next from '../i18n.js';
import BaseError from './BaseError.js';

export default class DuplicateIDError extends BaseError {
  constructor(nationalIdentificationNumber: string | undefined, lng = 'rw') {
    const message = i18next.t('national_identification_number_exists', {
      national_identification_number: nationalIdentificationNumber,
      lng: lng,
    });

    super(message, 400);
  }
}
