import type {
  RegisterUserDTO,
  RegisterUserResponse,
  RegisterUserWithAccountDTO,
} from '../../types/register-user.types.js';
import type { UserRoles } from '../../types/user.types.js';
import type { AccountRole } from '../../types/user.types.js';

export interface IUserService {
  findRolesByAccountId(accountId: string): Promise<UserRoles | null>;
  /**
   * Registers a new user and creates their clinical profile.
   * @param userData - Data for registering the user
   * @returns The created user
   */
  registerUser(userData: RegisterUserDTO): Promise<RegisterUserResponse>;

  // Search User by Patient Number
  findUserByPatientNumber(patientNumber: number): Promise<any | null>;

  /**
   * Get all users with basic info (id, name, roles[])
   */
  getAllUsers(): Promise<Array<{ id: string; name: string; roles: AccountRole[] }>>;

  /**
   * Find a social health worker in a given village.
   * @param village - The village name to search in
   * @returns The social health worker user object, or null if not found
   */
  findSocialHealthWorkerByVillage(village: string): Promise<any | null>;

  // RegisterUserWithAccount
  registerUserWithAccount(userData: RegisterUserWithAccountDTO): Promise<any>;
}
