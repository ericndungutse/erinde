import DuplicateSHWPerVillage from "./DuplicateSHWPerVillage.js";

export const DUPLICATE_KEY_ERRORS: Record<string, (keyValue: Record<string, string>) => Error> = {
  'address.village': (kv) => new DuplicateSHWPerVillage(kv['address.village']),
};
