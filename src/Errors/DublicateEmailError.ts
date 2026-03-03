import i18next from '../i18n.js';
import BaseError from './BaseError.js';

export default class DuplicateEmailError extends BaseError {
  constructor(email: string | undefined, lng = 'rw') {
    const message = i18next.t('email_exists', {
      email: email,
      lng: lng,
    });
    super(message, 400);
  }
}
