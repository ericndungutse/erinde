import { setupHospitalsFromReads } from "./setup-hospitals.js";
import { setupCommunityHealthUnitsFromReads } from "./setup-community-health-units.js";
import { setupUsersFromReads } from "./setup-users.js";
import { setupAccountsFromReads } from "./setup-accounts.js";
import { setupClinicalProfilesFromReads } from "./setup-clinical-profiles.js";
import { setupIndicatorsFromReads } from "./setup-indicators.js";

export async function runFixtureSetups(): Promise<void> {
  await setupHospitalsFromReads();
  await setupCommunityHealthUnitsFromReads();
  await setupUsersFromReads();
  await setupAccountsFromReads();
  await setupClinicalProfilesFromReads();
  await setupIndicatorsFromReads();
}

export {
  setupHospitalsFromReads,
  setupCommunityHealthUnitsFromReads,
  setupUsersFromReads,
  setupAccountsFromReads,
  setupClinicalProfilesFromReads,
  setupIndicatorsFromReads,
};
