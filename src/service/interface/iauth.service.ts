import type { ILoginPayload, ILoginResponse } from '../../types/auth.types.js';

export interface IAuthService {
  login(credentials: ILoginPayload): Promise<ILoginResponse>;
  handleSocialHealthWorkerCustomLoginResponse(loginResponse: ILoginResponse, userId: string): Promise<ILoginResponse>;
}
