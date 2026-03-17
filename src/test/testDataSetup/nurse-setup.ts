import { readFileSync } from 'node:fs';

import type { RegisterUserWithAccountDTO } from '../../dto/user.dto.js';
import { UserService } from '../../service/user.service.js';
import {
  type CreatedHospitalIdsMap,
} from './hospital-setup.js';
import {
  type CreatedCommunitHealthUnitIdsMap,
  findCommunitHealthUnitSetupKeyByAddress,
  resolveCommunitHealthUnitIdBySetupKey,
} from './communit-health-unit-setup.js';

type NurseSetupPayload = Omit<RegisterUserWithAccountDTO, 'hospitalId' | 'communitHealthUnit'>;
type NurseSetupMap = Record<string, NurseSetupPayload>;

const nurseSetupPath = new URL('../fixtures/nurse-setup.json', import.meta.url);

export const NURSE_SETUP = JSON.parse(
  readFileSync(nurseSetupPath, 'utf-8'),
) as NurseSetupMap;

function resolveHospitalSetupKey(nurseSetupKey: string): string {
  const hospitalSetupKey = nurseSetupKey.replace(/^NURSE_/, '');

  if (hospitalSetupKey === nurseSetupKey) {
    throw new Error(`Invalid nurse setup key: ${nurseSetupKey}`);
  }

  return hospitalSetupKey;
}

function resolveCommunitHealthUnitIdForNurse(
  nurseSetupKey: string,
  nursePayload: NurseSetupPayload,
  createdCommunitHealthUnits: CreatedCommunitHealthUnitIdsMap,
): string {
  const communitHealthUnitSetupKeyByAddress = findCommunitHealthUnitSetupKeyByAddress(
    nursePayload.address,
  );

  if (communitHealthUnitSetupKeyByAddress) {
    return resolveCommunitHealthUnitIdBySetupKey(
      communitHealthUnitSetupKeyByAddress,
      createdCommunitHealthUnits,
    );
  }

  const fallbackCommunitHealthUnitSetupKey = Object.keys(createdCommunitHealthUnits)[0];

  if (!fallbackCommunitHealthUnitSetupKey) {
    throw new Error(
      `No created community health units available for nurse key: ${nurseSetupKey}`,
    );
  }

  return createdCommunitHealthUnits[fallbackCommunitHealthUnitSetupKey]!;
}

export async function createNursesFromSetup(
  createdHospitals: CreatedHospitalIdsMap,
  createdCommunitHealthUnits: CreatedCommunitHealthUnitIdsMap,
): Promise<void> {
  const userService = new UserService();

  for (const [nurseSetupKey, nursePayload] of Object.entries(NURSE_SETUP)) {
    const hospitalSetupKey = resolveHospitalSetupKey(nurseSetupKey);
    const hospitalId = createdHospitals[hospitalSetupKey];

    if (!hospitalId) {
      throw new Error(
        `Missing created hospital for nurse key: ${nurseSetupKey}`,
      );
    }

    const communitHealthUnit = resolveCommunitHealthUnitIdForNurse(
      nurseSetupKey,
      nursePayload,
      createdCommunitHealthUnits,
    );

    await userService.registerUserWithAccount({
      ...nursePayload,
      hospitalId,
      communitHealthUnit,
    });
  }
}