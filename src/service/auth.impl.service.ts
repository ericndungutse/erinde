import Account from '../models/account.model.js';
import bcrypt from 'bcrypt';
import type { IAuthenticatePayload } from '../types/account.types.js';
import type { AuthService } from './interface/auth.service.js';
import { generateToken } from '../security/jwt.utils.js';
import type { IAuthenticateResponseData } from '../types/auth.types.js';

export default class AuthServiceImpl implements AuthService {
  async authenticate(credentials: IAuthenticatePayload): Promise<IAuthenticateResponseData> {
    // Find user by email or username
    const account = await Account.findOne({
      $or: [{ email: credentials.identifier }, { username: credentials.identifier }],
    });

    if (!account) {
      throw new Error('Invalid credentials');
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(credentials.password, account.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token: string = generateToken({ id: account._id.toString(), email: account.email, roles: account.roles });

    return {
      token,
      user: {
        id: account._id.toString(),
        username: account.username,
        email: account.email,
        phoneNumber: account.phoneNumber,
        roles: account.roles,
      },
    };
  }
}
