import type { RegisterUserDTO, RegisterUserResponse } from '../../types/register-user.types.js';
import type { UserRoles } from '../../types/user.types.js';

export interface IUserService {
  findRolesByAccountId(accountId: string): Promise<UserRoles | null>;
  /**
   * Registers a new user and creates their clinical profile.
   * @param userData - Data for registering the user
   * @returns The created user
   */
  registerUser(userData: RegisterUserDTO): Promise<RegisterUserResponse>;
}
