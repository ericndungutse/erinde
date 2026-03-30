import bcrypt from "bcrypt";
import InvalidCredentialsError from "../Errors/InvalidCredentialsError.js";
import Account from "../models/account.model.js";
import { generateToken } from "../security/jwt.utils.js";
import type {
  ILoggedInUser,
  ILoginPayload,
  ILoginResponse,
} from "../types/auth.types.js";
import type { UserProjection } from "../dto/user.dto.js";
import type { IAuthService } from "./interface/iauth.service.js";
import { Nurse } from "../models/user.model.js";
import { UserRole } from "../types/roles.types.js";
import CommunityHealthUnit from "../models/communitHealthUnit.model.js";
import { logger } from "../logger.js";
import type { IUser } from "../domain/user.js";

export default class AuthService implements IAuthService {
  async login(credentials: ILoginPayload): Promise<ILoginResponse> {
    // 1. TRACE: Start of the operation (Useful for debugging flow)
    logger.trace(
      { identifier: credentials.identifier },
      "Login attempt initiated",
    );

    const account = await Account.findOne({
      $or: [
        { email: credentials.identifier },
        { phoneNumber: credentials.identifier },
      ],
    });

    if (!account) {
      // 2. WARN: Authentication failure (Not an 'error' because the system didn't break)
      logger.warn(
        { identifier: credentials.identifier },
        "Login failed: Account not found",
      );
      throw new InvalidCredentialsError();
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      account.password,
    );
    if (!isPasswordValid) {
      // 3. WARN: Potential brute force or typo
      logger.warn(
        { accountId: account._id, identifier: credentials.identifier },
        "Login failed: Incorrect password",
      );
      throw new InvalidCredentialsError();
    }

    const user = await account.getUser(["roles", "communityHealthUnit"]);

    if (!user) {
      // 4. ERROR: Logic/Data integrity issue (Account exists but User record is missing)
      logger.error(
        { accountId: account._id },
        "Data Integrity Error: Account has no associated User record",
      );
      throw new Error("User roles not found");
    }

    // User is a nurse
    if (user.roles.includes(UserRole.NURSE)) {
      return await this.handleNurseCustomLoginResponse(user, account);
    }

    // User is a social health worker
    if (user.roles.includes(UserRole.SOCIAL_HEALTH_WORKER)) {
      return await this.handleSocialHealthWorkerCustomLoginResponse(
        user,
        account,
      );
    }

    // Default login response for other roles (e.g., ADMIN, SCREENING_VOLUNTEER)
    const payload = {
      accountId: account._id.toString(),
      email: account?.email,
      roles: user.roles,
      communityHealthUnit: user.communityHealthUnit,
    };

    return {
      token: generateToken(payload, user.id),
      user: {
        id: user.id,
        roles: user.roles,
        communityHealthUnit: user.communityHealthUnit,
      },
    };
  }

  // Social Health Worker Login Handler
  async handleSocialHealthWorkerCustomLoginResponse(
    user: any,
    account: any,
  ): Promise<ILoginResponse> {
    const managedCommunityHealthUnit = await CommunityHealthUnit.findOne(
      { socialHealthWorker: user.id },
      { _id: 1, name: 1 },
    ).lean();

    const loggedInuser: ILoggedInUser = {
      id: user.id,
      roles: user.roles,
      communityHealthUnit: user.communityHealthUnit,
      managedCommunityHealthUnit: managedCommunityHealthUnit
        ? {
            id: managedCommunityHealthUnit._id.toString(),
            name: managedCommunityHealthUnit.name,
          }
        : undefined,
    };
    // Create token payload
    const payload = {
      accountId: account._id.toString(),
      email: account?.email || undefined,
      roles: user.roles,
      communityHealthUnit: user.communityHealthUnit,
      managedCommunityHealthUnit: loggedInuser.managedCommunityHealthUnit,
    };

    const token = generateToken(payload, user.id);

    let loginResponse: ILoginResponse = {
      token,
      user: loggedInuser,
    };

    return loginResponse;
  }

  // Nurse Login Handler
  async handleNurseCustomLoginResponse(
    user: any,
    account: any,
  ): Promise<ILoginResponse> {
    const nurse = await Nurse.findById(user.id, { hospitalId: 1 }).lean();
    if (!nurse) {
      logger.error(
        { userId: user.id },
        "Nurse profile missing for user with NURSE role",
      );
      throw new InvalidCredentialsError();
    }

    const payload = {
      accountId: account._id.toString(),
      email: account?.email,
      roles: user.roles,
      hospitalId: nurse?.hospitalId?.toString(),
    };

    const token: string = generateToken(payload, user.id);

    return {
      token,
      user: {
        id: user.id,
        roles: user.roles,
        hospitalId: nurse?.hospitalId?.toString(),
        communityHealthUnit: user.communityHealthUnit,
      },
    };
  }
}
