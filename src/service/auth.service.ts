import bcrypt from "bcrypt";
import InvalidCredentialsError from "../Errors/InvalidCredentialsError.js";
import Account from "../models/account.model.js";
import { generateToken } from "../security/jwt.utils.js";
import type { ILoginPayload, ILoginResponse } from "../types/auth.types.js";
import type { UserProjection } from "../dto/user.dto.js";
import type { IAuthService } from "./interface/iauth.service.js";
import { Nurse } from "../models/user.model.js";
import { UserRole } from "../types/roles.types.js";
import CommunityHealthUnit from "../models/communitHealthUnit.model.js";
import { logger } from "../logger.js";

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

    let nurse;
    if (user.roles.includes(UserRole.NURSE)) {
      nurse = await Nurse.findById(user.id, { hospitalId: 1 }).lean();
      if (!nurse) {
        logger.error(
          { userId: user.id },
          "Nurse profile missing for user with NURSE role",
        );
        throw new InvalidCredentialsError();
      }
    }

    const payload = {
      accountId: account._id.toString(),
      email: account?.email || undefined,
      roles: user.roles,
      hospitalId: nurse?.hospitalId.toString() || undefined,
    };

    const token: string = generateToken(payload, user.id);

    let loginResponse: ILoginResponse = {
      token,
      user: {
        id: user.id,
        roles: user.roles,
        hospitalId: nurse?.hospitalId.toString() || undefined,
        communityHealthUnit: user.communityHealthUnit,
      },
    };

    if (user.roles.includes(UserRole.SOCIAL_HEALTH_WORKER)) {
      logger.debug(
        { userId: user.id },
        "Handling custom response for Social Health Worker",
      );
      loginResponse = await this.handleSocialHealthWorkerCustomLoginResponse(
        loginResponse,
        user.id,
      );
    }

    // 5. INFO: High-level success message
    logger.info(
      {
        userId: user.id,
        roles: user.roles,
        hospitalId: nurse?.hospitalId,
      },
      "User logged in successfully",
    );

    return loginResponse;
  }

  async handleSocialHealthWorkerCustomLoginResponse(
    loginResponse: ILoginResponse,
    userId: string,
  ): Promise<ILoginResponse> {
    const normalizeCommunityHealthUnitId = (
      value: unknown,
    ): string | undefined => {
      if (!value) {
        return undefined;
      }

      if (typeof value === "object" && value !== null && "id" in value) {
        return normalizeCommunityHealthUnitId((value as { id: unknown }).id);
      }

      if (Buffer.isBuffer(value)) {
        return value.toString("hex");
      }

      if (typeof value === "string") {
        return value;
      }

      return String(value);
    };

    const assignedCommunityHealthUnitId = normalizeCommunityHealthUnitId(
      loginResponse.user.communityHealthUnit,
    );

    const [assignedCommunityHealthUnit, managedCommunityHealthUnit] =
      await Promise.all([
        assignedCommunityHealthUnitId
          ? CommunityHealthUnit.findById(assignedCommunityHealthUnitId, {
              _id: 1,
              name: 1,
            }).lean()
          : Promise.resolve(null),
        CommunityHealthUnit.findOne(
          { socialHealthWorker: userId },
          {
            _id: 1,
            name: 1,
          },
        ).lean(),
      ]);

    const normalizeCommunityHealthUnit = (
      communityHealthUnit: {
        _id: unknown;
        name: string;
      } | null,
    ) => {
      if (!communityHealthUnit) {
        return undefined;
      }

      return {
        id: String(communityHealthUnit._id),
        name: communityHealthUnit.name,
      };
    };

    const communityHealthUnit = normalizeCommunityHealthUnit(
      assignedCommunityHealthUnit,
    );
    const managedCommunityHealthUnitDetails = normalizeCommunityHealthUnit(
      managedCommunityHealthUnit,
    );

    return {
      ...loginResponse,
      user: {
        ...loginResponse.user,
        ...(communityHealthUnit ? { communityHealthUnit } : {}),
        ...(managedCommunityHealthUnitDetails
          ? { managedCommunityHealthUnit: managedCommunityHealthUnitDetails }
          : {}),
      },
    };
  }
}
