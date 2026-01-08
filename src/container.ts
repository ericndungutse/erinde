import AuthController from './controller/auth.controller.js';
import IndicatorController from './controller/indicator.controller.js';
import UserController from './controller/user.controller.js';
import AuthService from './service/auth.service.js';
import { IndicatorService } from './service/indicator.service.js';
import type { IAuthService } from './service/interface/iauth.service.js';
import type { IIndicatorService } from './service/interface/iindicators.service.js';
import type { IUserService } from './service/interface/iuser.service.js';
import { UserService } from './service/user.service.js';

class Container {
  private _authService: IAuthService;
  private _authController: AuthController;
  private _indicatorService: IIndicatorService;
  private _indicatorController: IndicatorController;
  private _userService: IUserService;
  private _userController: UserController;

  constructor() {
    this._authService = new AuthService();
    this._authController = new AuthController(this._authService);
    this._indicatorService = new IndicatorService();
    this._indicatorController = new IndicatorController(this._indicatorService);

    // User Injections
    this._userService = new UserService();
    this._userController = new UserController(this._userService);
  }

  // 4. Getters to access the wired-up instances
  get authController() {
    return this._authController;
  }

  get authService() {
    return this._authService;
  }

  get indicatorController() {
    return this._indicatorController;
  }

  get userController() {
    return this._userController;
  }
}
// Export a single instance of the container
export const container = new Container();
