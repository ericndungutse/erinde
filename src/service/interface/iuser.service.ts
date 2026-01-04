import type { UserRoles } from '../../types/user.types.js';

export interface IUserService {
  findRolesByAccountId(accountId: string): Promise<UserRoles | null>;
}
