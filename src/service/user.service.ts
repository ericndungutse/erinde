import User from '../models/user.model.js';
import type { RegisterUserDTO, RegisterUserResponse } from '../types/register-user.types.js';
import { AccountRole, type UserRoles } from '../types/user.types.js';
import type { IUserService } from './interface/iuser.service.js';

export class UserService implements IUserService {
  async registerUser(userData: RegisterUserDTO): Promise<RegisterUserResponse> {
    const { nationalIdentificationNumber, contact } = userData;

    // 1. Check if user exists
    const existingUser = await User.findOne({
      $or: [{ nationalIdentificationNumber }, { 'contact.email': contact.email }, { 'contact.phone': contact.phone }],
    });
    if (existingUser) {
      throw new Error('User already exists with provided identification, email, or phone');
    }

    // 2. Create the user
    const user = new User({ ...userData });
    user.roles = [AccountRole.USER];
    await user.save();

    // 3. Generate patient number from Counter
    // Counter _id: 'patientNumber'
    const Counter = (await import('../models/counter.model.js')).default;
    const counter = await Counter.findByIdAndUpdate('patientNumber', { $inc: { seq: 1 } }, { new: true, upsert: true });
    const seq = counter.seq;
    const patientNumber = `${seq.toString().padStart(6, '0')}`;

    // 4. Create clinical profile linked to user
    const ClinicalProfile = (await import('../models/clinicalProfile.model.js')).default;
    await ClinicalProfile.create({
      userId: user._id,
      patientNumber,
    });

    // 5. Return patientNumber
    return { patientNumber };
  }

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
