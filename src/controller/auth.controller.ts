import type { Request, Response } from 'express';
import { LoginSchema, type ILoginResponse } from '../types/auth.types.js';
import type AuthService from '../service/auth.service.js';

export default class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  async authenticate(req: Request, res: Response): Promise<void> {
    // Validate
    LoginSchema.parse(req.body);

    // Authenticate
    const result: ILoginResponse = await this.authService.login(req.body);

    // Placeholder response
    res.status(200).json({ status: 'success', message: 'Authentication successful', data: result });
  }
}
