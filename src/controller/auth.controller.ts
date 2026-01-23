import type { NextFunction, Request, Response } from 'express';
import type AuthService from '../service/auth.service.js';
import { type ILoginResponse } from '../types/auth.types.js';
import responseFactory from './responseFactory.js';

export default class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Authenticate
      const result: ILoginResponse = await this.authService.login(req.body);

      responseFactory.getResponseFactory(res).ok({
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
