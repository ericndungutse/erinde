import i18next from '../i18n.js';
import BaseError from './BaseError.js';

export default class DuplicateSHWPerVillage extends BaseError {
  constructor(village: string | undefined, lng = 'rw') {
    const message = i18next.t('shw_exists_for_village', {
      village: village,
      lng: lng,
    });

    super(message, 400);
  }
}
