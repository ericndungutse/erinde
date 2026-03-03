import BaseError from './BaseError.js';
import i18next from '../i18n.js';

export default class DuplicatePhoneError extends BaseError {
  constructor(phone: string | undefined, lng = 'rw') {
    const message = i18next.t('phone_number_exists', {
      phone_number: phone,
      lng: lng,
    });
    console.log('DuplicatePhoneError message:', message);
    super(message, 400);
  }
}
