import { readFileSync } from 'node:fs';

import Hospital from '../../models/hospital.model.js';
import { CreateHospitalSchema } from '../../types/hospital.types.js';

type CreateHospitalDTO = {
  name: string;
  type: string;
  address: {
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
};

type HospitalSetupMap = Record<string, CreateHospitalDTO>;
export type CreatedHospitalIdsMap = Record<string, string>;

const hospitalSetupPath = new URL('../fixtures/hostpitals-setup.json', import.meta.url);

export const HOSPITAL_SETUP = JSON.parse(
  readFileSync(hospitalSetupPath, 'utf-8'),
) as HospitalSetupMap;




/**
 * Creates or updates hospitals in the database from the predefined HOSPITAL_SETUP.
 *
 * For each hospital in HOSPITAL_SETUP:
 *   1. Validates the hospital payload using CreateHospitalSchema.
 *   2. Searches for an existing hospital by name.
 *   3. If found, updates the existing hospital with the new payload.
 *   4. If not found, inserts a new hospital document (upsert).
 *
 * Returns a mapping of hospital setup keys to their MongoDB `_id`s as strings.
 *
 * @async
 * @function createHospitalsFromSetup
 * @returns {Promise<CreatedHospitalIdsMap>} 
 *   An object where each key is a hospital setup identifier (from HOSPITAL_SETUP)
 *   and each value is the corresponding hospital's `_id` as a string.
 *
 * @throws {Error} If a hospital cannot be created or updated for any setup key.
 *
 * @example
 * const createdHospitals = await createHospitalsFromSetup();
 * console.log(createdHospitals);
 * // {
 * //   NYIRANUMA_HEALTH_CENTER: '69b2af91abcf52733d7ad1e4',
 * //   NYIRANUMA_DISTRICT_HOSPITAL: '69b2af91abcf52733d7ad1e5',
 * //   KICUKIRO_HEALTH_CENTER: '69b2af91abcf52733d7ad1e6',
 * //   KICUKIRO_DISTRICT_HOSPITAL: '69b2af91abcf52733d7ad1e7'
 * // }
 */
export async function createHospitalsFromSetup(): Promise<CreatedHospitalIdsMap> {
  const createdHospitalIds: CreatedHospitalIdsMap = {};

  for (const [hospitalSetupKey, rawHospitalPayload] of Object.entries(HOSPITAL_SETUP)) {
    const hospitalPayload = CreateHospitalSchema.parse(rawHospitalPayload);

    const hospital = await Hospital.findOneAndUpdate(
      { name: hospitalPayload.name },
      { $set: hospitalPayload },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).exec();

    if (!hospital) {
      throw new Error(`Failed to create hospital for key: ${hospitalSetupKey}`);
    }

    createdHospitalIds[hospitalSetupKey] = hospital._id.toString();
  }

  return createdHospitalIds;
}