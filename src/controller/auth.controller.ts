import type { NextFunction, Request, Response } from "express";
import type { IAuthService } from "../service/interface/iauth.service.js";
import { type ILoginResponse } from "../types/auth.types.js";
import responseFactory from "./responseFactory.js";

export default class AuthController {
  private authService: IAuthService;

  constructor(authService: IAuthService) {
    this.authService = authService;
  }

  async authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Authenticate
      const result: ILoginResponse = await this.authService.login(req.body);

      responseFactory.getResponseFactory(res).ok({
        message: req.t("login_successful"),
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
