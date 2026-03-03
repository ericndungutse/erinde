import DuplicateEmailError from './DublicateEmailError.js';
import DuplicatePhoneError from './DublicatePhoneError.js';
import DuplicateIDError from './DuplicateIDError.js';
import DuplicateSHWPerVillage from './DuplicateSHWPerVillage.js';

export const DUPLICATE_KEY_ERRORS: Record<string, (keyValue: Record<string, string>, lng?: string) => Error> = {
  'address.village': (kv, lng) => new DuplicateSHWPerVillage(kv['address.village'], lng),
  nationalIdentificationNumber: (kv, lng) => new DuplicateIDError(kv['nationalIdentificationNumber'], lng),
  'contact.phone': (kv, lng) => new DuplicatePhoneError(kv['contact.phone'], lng),
  'contact.email': (kv, lng) => new DuplicateEmailError(kv['contact.email'], lng),
};
