import type {
  GetAllUsersResult,
  IAdminUpdateUserPasswordPayload,
  RegisterUserDTO,
  RegisterUserResponse,
  RegisterUserWithAccountDTO,
  UserRoles,
} from '../../dto/user.dto.js';
import type mongoose from 'mongoose';

export interface IUserService {
  findRolesByAccountId(accountId: string): Promise<UserRoles | null>;
  /**
   * Registers a new user and creates their clinical profile.
   * @param userData - Data for registering the user
   * @returns The created user
   */
  registerUser(userData: RegisterUserDTO): Promise<RegisterUserResponse>;

  // Search User by Patient Number
  findUserByPatientNumber(patientNumber: number, session?: any): Promise<any | null>;

  // Admin: detailed lookup by user id
  findUserDetailsByUserIdForAdmin(userId: string): Promise<any | null>;

  /**
   * Get all users with basic info (id, name, roles[])
   */
  getAllUsers(queryString: Record<string, string | string[] | undefined>): Promise<GetAllUsersResult>;

  /**
   * Find a social health worker in a given village.
   * @param village - The village name to search in
   * @returns The social health worker user object, or null if not found
   */
  findSocialHealthWorkerByVillage(village: string): Promise<any | null>;

  // RegisterUserWithAccount
  registerUserWithAccount(userData: RegisterUserWithAccountDTO): Promise<any>;

  // Create a social health worker user+account and attach to a community health unit
  registerSocialHealthWorkerWithAccountForCommunityHealthUnit(
    userData: Omit<RegisterUserDTO, 'communityHealthUnit'>,
    communityHealthUnitId: string,
    session?: mongoose.ClientSession,
  ): Promise<any>;

  // Admin: update account password for a given user
  updateUserPasswordByAdmin(userId: string, payload: IAdminUpdateUserPasswordPayload): Promise<void>;
}
