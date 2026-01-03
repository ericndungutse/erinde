import type { IAuthenticatePayload } from '../types/account.types.js';
import type { AuthService } from './interface/auth.service.js';

export default class AuthServiceImpl implements AuthService {
  authenticate(credentials: IAuthenticatePayload): Promise<string> {
    throw new Error('Method not implemented.');
  }
}
