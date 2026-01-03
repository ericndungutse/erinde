import type { Request, Response } from 'express';
import { AuthenticateSchema } from '../types/account.types.js';
import type { AuthService } from '../service/interface/auth.service.js';

export default class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  async authenticate(req: Request, res: Response): Promise<void> {
    // Validate
    AuthenticateSchema.parse(req.body);

    // Placeholder response
    res.status(200).json({ message: 'Authentication successful' });
  }
}
