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

const hospitalSetupPath = new URL('../fixtures/hostpitals-setup.json', import.meta.url);

export const HOSPITAL_SETUP = JSON.parse(
  readFileSync(hospitalSetupPath, 'utf-8'),
) as HospitalSetupMap;

export async function createHospitalsFromSetup(): Promise<void> {
  for (const rawHospitalPayload of Object.values(HOSPITAL_SETUP)) {
    const hospitalPayload = CreateHospitalSchema.parse(rawHospitalPayload);

    await Hospital.findOneAndUpdate(
      { name: hospitalPayload.name },
      { $set: hospitalPayload },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).exec();
  }
}