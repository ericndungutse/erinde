import { registerAccountsFromSetup } from './account-setup.js';
import {
  createHospitalsFromSetup,
  type CreatedHospitalIdsMap,
} from './hospital-setup.js';
import { createNursesFromSetup } from './nurse-setup.js';

export type OrchestratedTestDataSetup = {
  createdHospitals: CreatedHospitalIdsMap;
};

export async function setupTestData(): Promise<OrchestratedTestDataSetup> {
  await registerAccountsFromSetup();

  const createdHospitals = await createHospitalsFromSetup();

  await createNursesFromSetup(createdHospitals);

  return {
    createdHospitals,
  };
}
