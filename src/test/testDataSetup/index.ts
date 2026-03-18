import { registerAccountsFromSetup } from './account-setup.js';
import {
  createHospitalsFromSetup,
  type CreatedHospitalIdsMap,
} from './hospital-setup.js';
import { seedIndicatorsFromSetup } from './indicator-setup.js';
import { createNursesFromSetup } from './nurse-setup.js';
import { createCommunitHealthUnitsFromSetup } from './communit-health-unit-setup.js';

export type OrchestratedTestDataSetup = {
  createdHospitals: CreatedHospitalIdsMap;
  createdCommunitHealthUnits: any; // Replace 'any' with the actual type if available
};

export async function setupTestData(): Promise<OrchestratedTestDataSetup> {
  const createdHospitals = await createHospitalsFromSetup();

  const createdCommunitHealthUnits = await createCommunitHealthUnitsFromSetup(
    createdHospitals,
  );

  await registerAccountsFromSetup(createdCommunitHealthUnits);

  await createNursesFromSetup(createdHospitals, createdCommunitHealthUnits);

  await seedIndicatorsFromSetup();

  return {
    createdHospitals, createdCommunitHealthUnits
  };
}
