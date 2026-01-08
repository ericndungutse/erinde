import type { Request, Response } from 'express';
import { UserService } from '../service/user.service.js';
import type { RegisterUserDTO } from '../types/register-user.types.js';
import type { IUserService } from '../service/interface/iuser.service.js';

export default class UserController {
  private _userService: UserService;

  constructor(userService: IUserService) {
    this._userService = userService;
  }

  async registerUserController(req: Request, res: Response) {
    try {
      const userData: RegisterUserDTO = req.body;
      const result = await this._userService.registerUser(userData);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ status: 'fail', message: error.message || 'Registration failed' });
    }
  }
}
