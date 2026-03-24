import bcrypt from 'bcrypt';
import InvalidCredentialsError from '../Errors/InvalidCredentialsError.js';
import Account from '../models/account.model.js';
import { generateToken } from '../security/jwt.utils.js';
import type { ILoginPayload, ILoginResponse } from '../types/auth.types.js';
import type { UserProjection } from '../dto/user.dto.js';
import type { IAuthService } from './interface/iauth.service.js';
import { Nurse } from '../models/user.model.js';
import { UserRole } from '../types/roles.types.js';
import CommunityHealthUnit from '../models/communitHealthUnit.model.js';

export default class AuthService implements IAuthService {
  async login(credentials: ILoginPayload): Promise<ILoginResponse> {
    // Find user by email or username
    const account = await Account.findOne({
      $or: [{ email: credentials.identifier }, { phoneNumber: credentials.identifier }],
    });

    if (!account) {
      throw new InvalidCredentialsError();
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(credentials.password, account.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // Get User and Roles - assuming account has a reference to user
    const user: (UserProjection<'roles' | 'communityHealthUnit'> & { id: string }) | null = await account.getUser([
      'roles',
      'communityHealthUnit',
    ]);

    let nurse;
    // if iser is a nurse, get his hospital id and add to the payload
    if (user?.roles.includes(UserRole.NURSE)) {
      nurse = await Nurse.findById(user.id, { hospitalId: 1 }).lean();
      if (!nurse) {
        throw new InvalidCredentialsError();
      }
    }

    if (!user) {
      throw new Error('User roles not found');
    }

    // Generate JWT token
    const payload: { accountId: string; email: string | undefined; roles: string[]; hospitalId?: string | undefined } =
      {
        accountId: account._id.toString(),
        email: account?.email || undefined,
        roles: user.roles,
        hospitalId: nurse?.hospitalId.toString() || undefined,
      };

    const token: string = generateToken(payload, user.id);

    // TODO: IF USER HAS MULTIPLE ROLES, REQUEST U  SER TO SELECT ACTIVE ROLE
    // TODO: IF USER IS JUST ONLY USER, SET ACTIVE ROLE TO USER: OPTION let Client Decide

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
      loginResponse = await this.handleSocialHealthWorkerCustomLoginResponse(loginResponse, user.id);
    }

    return loginResponse;
  }

  async handleSocialHealthWorkerCustomLoginResponse(loginResponse: ILoginResponse, userId: string): Promise<ILoginResponse> {
    const normalizeCommunityHealthUnitId = (value: unknown): string | undefined => {
      if (!value) {
        return undefined;
      }

      if (typeof value === 'object' && value !== null && 'id' in value) {
        return normalizeCommunityHealthUnitId((value as { id: unknown }).id);
      }

      if (Buffer.isBuffer(value)) {
        return value.toString('hex');
      }

      if (typeof value === 'string') {
        return value;
      }

      return String(value);
    };

    const assignedCommunityHealthUnitId = normalizeCommunityHealthUnitId(loginResponse.user.communityHealthUnit);

    const [assignedCommunityHealthUnit, managedCommunityHealthUnit] = await Promise.all([
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

    const communityHealthUnit = normalizeCommunityHealthUnit(assignedCommunityHealthUnit);
    const managedCommunityHealthUnitDetails = normalizeCommunityHealthUnit(managedCommunityHealthUnit);

    return {
      ...loginResponse,
      user: {
        ...loginResponse.user,
        ...(communityHealthUnit ? { communityHealthUnit } : {}),
        ...(managedCommunityHealthUnitDetails ? { managedCommunityHealthUnit: managedCommunityHealthUnitDetails } : {}),
      },
    };
  }
}
