import { ConstantValues } from '../constants/constant.values.js';
import Account from '../models/account.model.js';
import ClinicalProfile from '../models/clinicalProfile.model.js';
import Counter from '../models/counter.model.js';
import User from '../models/user.model.js';
import {
  RegisterUserWithAccountSchema,
  type RegisterUserDTO,
  type RegisterUserResponse,
  type RegisterUserWithAccountDTO,
} from '../types/register-user.types.js';
import { AccountRole, type UserRoles } from '../types/user.types.js';
import type { IUserService } from './interface/iuser.service.js';

export class UserService implements IUserService {
  async registerUserWithAccount(userData: RegisterUserWithAccountDTO): Promise<any> {
    // Core steps
    // Register User
    const parsed = RegisterUserWithAccountSchema.parse(userData);
    const user = await User.create({ ...parsed, roles: [...(parsed.roles as AccountRole[]), AccountRole.USER] });
    // Create Account

    const account = await Account.create({
      email: parsed.contact.email,
      phoneNumber: parsed.contact.phone,
      password: ConstantValues.DEFAULT_PASSWORD,
      userId: user._id,
      mustChangePassword: true,
    });

    // Create Clinical Profile
    const counter = await Counter.findByIdAndUpdate('patientNumber', { $inc: { seq: 1 } }, { new: true, upsert: true });
    const patientNumber = counter.seq;
    const clinicalProfile = await ClinicalProfile.create({
      userId: user._id,
      patientNumber,
    });

    return { user, account, clinicalProfile };
  }

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
    const counter = await Counter.findByIdAndUpdate('patientNumber', { $inc: { seq: 1 } }, { new: true, upsert: true });
    const patientNumber = counter.seq;

    // 4. Create clinical profile linked to user

    // Find Health worker in the same village
    const socialHealthWorker = await this.findSocialHealthWorkerByVillage(userData.address.village);

    await ClinicalProfile.create({
      userId: user._id,
      patientNumber,
      healthWorkerId: socialHealthWorker?._id,
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

  async findUserByPatientNumber(patientNumber: number): Promise<any | null> {
    const clinicalProfile = await ClinicalProfile.findOne({ patientNumber })
      .populate({
        path: 'userId',
        select: 'firstname lastname nationalIdentificationNumber contact.phone',
      })
      .lean();

    if (!clinicalProfile || !clinicalProfile.userId) {
      return null;
    }

    const user: any = clinicalProfile.userId;

    return {
      nationalIdentificationNumber: user.nationalIdentificationNumber,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.contact?.phone,
    };
  }

  async findSocialHealthWorkerByVillage(village: string): Promise<any | null> {
    const socialHealthWorker = await User.findOne({
      roles: AccountRole.SOCIAL_HEALTH_WORKER,
      'address.village': village,
    }).lean();

    if (!socialHealthWorker) {
      return null;
    }

    return socialHealthWorker;
  }
}
