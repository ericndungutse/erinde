import type { ILoggedInUser } from './auth.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: ILoggedInUser;
    }
  }
}
