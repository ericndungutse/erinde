import type { ILoggedInUser } from './user.types.ts';

declare global {
  namespace Express {
    interface Request {
      user?: ILoggedInUser;
    }
  }
}
