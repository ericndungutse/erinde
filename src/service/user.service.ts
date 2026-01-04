import User from '../models/user.model.js';
import type { UserRoles } from '../types/user.types.js';
import type { IUserService } from './interface/iuser.service.js';

export class UserService implements IUserService {
  async findRolesByAccountId(accountId: string): Promise<UserRoles | null> {
    const userRoles = await User.findOne({ accountId }, { roles: 1 }).lean();

    if (!userRoles) {
      return null;
    }

    return {
      id: userRoles._id.toString(),
      roles: userRoles.roles,
    };
  }
}
