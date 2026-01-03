import type { AccountRole, IAccount } from './account.types.js';

// Construct a type by picking specific keys from IAccount
export type IAuthenticatedAccount = Pick<IAccount, 'username' | 'email' | 'phoneNumber' | 'roles'> & {
  id: string; // We map MongoDB's _id to 'id' for the frontend
};

export interface IAuthenticateResponseData {
  token: string;
  user: IAuthenticatedAccount;
}
