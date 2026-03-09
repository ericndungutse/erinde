import type { ILoggedInUser } from '../dto/user.dto.ts';

declare global {
  namespace Express {
    interface Request {
      user?: ILoggedInUser;
    }
  }
}
