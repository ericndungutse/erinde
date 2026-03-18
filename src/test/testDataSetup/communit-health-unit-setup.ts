import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';

import CommunityHealthUnit from '../../models/communitHealthUnit.model.js';
import type { CreatedHospitalIdsMap } from './hospital-setup.js';

type CommunitHealthUnitSetupPayload = {
  socialHealthWorkerSetupKey: string;
  healthCenterSetupKey: string;
  address: {
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
};

type CommunitHealthUnitSetupMap = Record<string, CommunitHealthUnitSetupPayload>;
export type CreatedCommunitHealthUnitIdsMap = Record<string, string>;

const communitHealthUnitSetupPath = new URL('../fixtures/communit-health-unit-setup.json', import.meta.url);

export const COMMUNIT_HEALTH_UNIT_SETUP = JSON.parse(
  readFileSync(communitHealthUnitSetupPath, 'utf-8'),
) as CommunitHealthUnitSetupMap;

function normalizeAddressValue(value: string): string {
  return value.trim().toLowerCase();
}

function isSameAddress(
  left: CommunitHealthUnitSetupPayload['address'],
  right: CommunitHealthUnitSetupPayload['address'],
): boolean {
  return (
    normalizeAddressValue(left.province) === normalizeAddressValue(right.province)
    && normalizeAddressValue(left.district) === normalizeAddressValue(right.district)
    && normalizeAddressValue(left.sector) === normalizeAddressValue(right.sector)
    && normalizeAddressValue(left.cell) === normalizeAddressValue(right.cell)
    && normalizeAddressValue(left.village) === normalizeAddressValue(right.village)
  );
}

export function findCommunitHealthUnitSetupKeyBySocialHealthWorkerSetupKey(
  socialHealthWorkerSetupKey: string,
): string | undefined {
  for (const [communitHealthUnitSetupKey, communitHealthUnitPayload] of Object.entries(COMMUNIT_HEALTH_UNIT_SETUP)) {
    if (communitHealthUnitPayload.socialHealthWorkerSetupKey === socialHealthWorkerSetupKey) {
      return communitHealthUnitSetupKey;
    }
  }

  return undefined;
}

export function findCommunitHealthUnitSetupKeyByAddress(
  address: CommunitHealthUnitSetupPayload['address'],
): string | undefined {
  for (const [communitHealthUnitSetupKey, communitHealthUnitPayload] of Object.entries(COMMUNIT_HEALTH_UNIT_SETUP)) {
    if (isSameAddress(communitHealthUnitPayload.address, address)) {
      return communitHealthUnitSetupKey;
    }
  }

  return undefined;
}

export function resolveCommunitHealthUnitIdBySetupKey(
  communitHealthUnitSetupKey: string,
  createdCommunitHealthUnits: CreatedCommunitHealthUnitIdsMap,
): string {
  const communitHealthUnitId = createdCommunitHealthUnits[communitHealthUnitSetupKey];

  if (!communitHealthUnitId) {
    throw new Error(
      `Missing created community health unit for key: ${communitHealthUnitSetupKey}`,
    );
  }

  return communitHealthUnitId;
}

export async function createCommunitHealthUnitsFromSetup(
  createdHospitals: CreatedHospitalIdsMap,
): Promise<CreatedCommunitHealthUnitIdsMap> {
  const createdCommunitHealthUnits: CreatedCommunitHealthUnitIdsMap = {};

  for (const [communitHealthUnitSetupKey, communitHealthUnitPayload] of Object.entries(COMMUNIT_HEALTH_UNIT_SETUP)) {
    const healthCenterId = createdHospitals[communitHealthUnitPayload.healthCenterSetupKey];

    if (!healthCenterId) {
      throw new Error(
        `Missing created hospital for community health unit key: ${communitHealthUnitSetupKey}`,
      );
    }

    const placeholderSocialHealthWorkerId = new mongoose.Types.ObjectId();

    const createdCommunitHealthUnit = await CommunityHealthUnit.findOneAndUpdate(
      {
        'address.province': communitHealthUnitPayload.address.province,
        'address.district': communitHealthUnitPayload.address.district,
        'address.sector': communitHealthUnitPayload.address.sector,
        'address.cell': communitHealthUnitPayload.address.cell,
        'address.village': communitHealthUnitPayload.address.village,
      },
      {
        $set: {
          name: `${communitHealthUnitPayload.address.village}-${communitHealthUnitPayload.address.cell}`,
          socialHealthWorker: placeholderSocialHealthWorkerId,
          healthCenter: healthCenterId,
          address: communitHealthUnitPayload.address,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).exec();

    if (!createdCommunitHealthUnit) {
      throw new Error(
        `Failed to create community health unit for key: ${communitHealthUnitSetupKey}`,
      );
    }

    createdCommunitHealthUnits[communitHealthUnitSetupKey] = createdCommunitHealthUnit._id.toString();
  }

  return createdCommunitHealthUnits;
}
