import type { NextFunction, Request, Response } from 'express';
import UserNotFoundError from '../Errors/UserNotFoundError.js';
import type { IUserService } from '../service/interface/iuser.service.js';
import type { RegisterUserDTO } from '../types/register-user.types.js';

export default class UserController {
  private _userService: IUserService;

  constructor(userService: IUserService) {
    this._userService = userService;
  }

  async registerUserWithAccountController(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, account, clinicalProfile } = await this._userService.registerUserWithAccount(req.body);
      return res.status(201).json({
        status: 'success',
        message: 'User registered with account successfully',
        data: {
          user,
          account,
          clinicalProfile,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  async registerUserController(req: Request, res: Response, next: NextFunction) {
    try {
      const userData: RegisterUserDTO = req.body;
      const patientNumber = await this._userService.registerUser(userData);
      return res.status(201).json({
        status: 'success',
        data: {
          patientNumber,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  async findUserByPatientNumberController(req: Request, res: Response) {
    try {
      const { patientNumber } = req.params;
      if (!patientNumber) {
        return res.status(400).json({ status: 'fail', message: 'Patient number is required' });
      }
      const user = await this._userService.findUserByPatientNumber(Number(patientNumber));
      if (!user) {
        return res.status(404).json({ status: 'fail', message: 'User not found' });
      }
      return res.status(200).json({ status: 'success', data: user });
    } catch (error: any) {
      return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
  }

  async findUserDetailsByUserIdForAdminController(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ status: 'fail', message: req.t('parameter_required', { parameter: 'userId' }) });
      }

      const details = await this._userService.findUserDetailsByUserIdForAdmin(userId);

      if (!details) {
        throw new UserNotFoundError();
      }

      return res.status(200).json({ status: 'success', data: details });
    } catch (error: any) {
      next(error);
    }
  }

  async updateUserPasswordByAdminController(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ status: 'fail', message: req.t('parameter_required', { parameter: 'userId' }) });
      }

      await this._userService.updateUserPasswordByAdmin(userId, req.body);

      return res.status(200).json({
        status: 'success',
        message: req.t('password_updated_successfully'),
      });
    } catch (error: any) {
      next(error);
    }
  }

  async getAllUsersController(_req: Request, res: Response) {
    try {
      const users = await this._userService.getAllUsers();
      return res.status(200).json({
        status: 'success',
        data: { users },
      });
    } catch (error: any) {
      return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
  }
}
