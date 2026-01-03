import type { IAuthenticateResponseData } from '../../types/auth.types.js';
import type { IAuthenticatePayload } from './../../types/account.types.js';
export interface AuthService {
  // Identifier can be username, email, or phone number
  authenticate(credentials: IAuthenticatePayload): Promise<IAuthenticateResponseData>;
}
