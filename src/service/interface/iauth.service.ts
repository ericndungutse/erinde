import type { ILoginPayload, ILoginResponse } from '../../types/auth.types.js';

export interface IAuthService {
  login(credentials: ILoginPayload): Promise<ILoginResponse>;
}
