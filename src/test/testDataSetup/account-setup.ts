import { readFileSync } from 'node:fs';

import type { RegisterUserWithAccountDTO } from '../../dto/user.dto.js';
import { UserService } from '../../service/user.service.js';

type AccountSetupMap = Record<string, RegisterUserWithAccountDTO>;

const accountSetupPath = new URL('../fixtures/account-setup.json', import.meta.url);

export const ACCOUNT_SETUP = JSON.parse(
	readFileSync(accountSetupPath, 'utf-8'),
) as AccountSetupMap;

export async function registerAccountsFromSetup(): Promise<void> {
	const userService = new UserService();

	for (const userPayload of Object.values(ACCOUNT_SETUP)) {
		await userService.registerUserWithAccount(userPayload);
	}
}
