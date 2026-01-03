import AuthController from './controller/auth.controller.js';
import AuthServiceImpl from './service/auth.impl.service.js';

class Container {
  private _authService: AuthServiceImpl;
  private _authController: AuthController;

  constructor() {
    this._authService = new AuthServiceImpl();
    this._authController = new AuthController(this._authService);
  }

  // 4. Getters to access the wired-up instances
  get authController() {
    return this._authController;
  }

  get authService() {
    return this._authService;
  }
}
// Export a single instance of the container
export const container = new Container();
