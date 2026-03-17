import { readFileSync } from 'node:fs';

import type { RegisterUserWithAccountDTO } from '../../dto/user.dto.js';
import { UserService } from '../../service/user.service.js';
import {
	type CreatedCommunitHealthUnitIdsMap,
	findCommunitHealthUnitSetupKeyByAddress,
	findCommunitHealthUnitSetupKeyBySocialHealthWorkerSetupKey,
	resolveCommunitHealthUnitIdBySetupKey,
} from './communit-health-unit-setup.js';

type AccountSetupPayload = Omit<RegisterUserWithAccountDTO, 'communitHealthUnit'>;
type AccountSetupMap = Record<string, AccountSetupPayload>;

const accountSetupPath = new URL('../fixtures/acounts-setup.json', import.meta.url);

export const ACCOUNT_SETUP = JSON.parse(
	readFileSync(accountSetupPath, 'utf-8'),
) as AccountSetupMap;

function resolveCommunitHealthUnitIdForAccount(
	accountSetupKey: string,
	accountPayload: AccountSetupPayload,
	createdCommunitHealthUnits: CreatedCommunitHealthUnitIdsMap,
): string {
	const communitHealthUnitSetupKeyBySocialHealthWorker =
		findCommunitHealthUnitSetupKeyBySocialHealthWorkerSetupKey(accountSetupKey);

	if (communitHealthUnitSetupKeyBySocialHealthWorker) {
		return resolveCommunitHealthUnitIdBySetupKey(
			communitHealthUnitSetupKeyBySocialHealthWorker,
			createdCommunitHealthUnits,
		);
	}

	const communitHealthUnitSetupKeyByAddress = findCommunitHealthUnitSetupKeyByAddress(
		accountPayload.address,
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
			`No created community health units available for account key: ${accountSetupKey}`,
		);
	}

	return createdCommunitHealthUnits[fallbackCommunitHealthUnitSetupKey]!;
}

export async function registerAccountsFromSetup(
	createdCommunitHealthUnits: CreatedCommunitHealthUnitIdsMap,
): Promise<void> {
	const userService = new UserService();

	for (const [accountSetupKey, userPayload] of Object.entries(ACCOUNT_SETUP)) {
		const communitHealthUnit = resolveCommunitHealthUnitIdForAccount(
			accountSetupKey,
			userPayload,
			createdCommunitHealthUnits,
		);

		await userService.registerUserWithAccount({
			...userPayload,
			communitHealthUnit,
		});
	}
}
