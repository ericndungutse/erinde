import bcrypt from 'bcrypt';
import InvalidCredentialsError from '../Errors/InvalidCredentialsError.js';
import Account from '../models/account.model.js';
import { generateToken } from '../security/jwt.utils.js';
import type { ILoginPayload, ILoginResponse } from '../types/auth.types.js';
import type { UserProjection } from '../dto/user.dto.js';
import type { IAuthService } from './interface/iauth.service.js';

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
    const user: (UserProjection<'roles'> & { id: string }) | null = await account.getUser(['roles']);

    if (!user) {
      throw new Error('User roles not found');
    }

    // Generate JWT token
    const payload: { accountId: string; email: string | undefined; roles: string[] } = {
      accountId: account._id.toString(),
      email: account?.email || undefined,
      roles: user.roles,
    };

    const token: string = generateToken(payload, user.id);

    // TODO: IF USER HAS MULTIPLE ROLES, REQUEST U  SER TO SELECT ACTIVE ROLE
    // TODO: IF USER IS JUST ONLY USER, SET ACTIVE ROLE TO USER: OPTION let Client Decide

    const loginResponse: ILoginResponse = {
      token,
      user: {
        id: user.id,
        roles: user.roles,
      },
    };

    return loginResponse;
  }
}
