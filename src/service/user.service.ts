import { ConstantValues } from '../constants/constant.values.js';
import DuplicateEmailError from '../Errors/DublicateEmailError.js';
import DuplicatePhoneError from '../Errors/DublicatePhoneError.js';
import DuplicateIDError from '../Errors/DuplicateIDError.js';
import mongoose from 'mongoose';
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
  async getAllUsers(): Promise<Array<{ id: string; name: string; roles: AccountRole[] }>> {
    const users = await User.find({}, { firstname: 1, lastname: 1, roles: 1 }).lean();
    return users.map((u: any) => {
      const name = `${u.firstname} ${u.lastname}`.trim();
      const roles: AccountRole[] = (
        Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [AccountRole.USER]
      ) as AccountRole[];
      return { id: u._id.toString(), name, roles };
    });
  }
  async registerUserWithAccount(userData: RegisterUserWithAccountDTO): Promise<any> {
    // Core steps
    // Register User
    const parsed = RegisterUserWithAccountSchema.parse(userData);
    const roles = [AccountRole.USER, ...(parsed.roles as AccountRole[])];

    const user = await User.create({
      ...parsed,
      contact: { email: parsed.contact?.email ?? undefined, phone: parsed.contact.phone },
      roles,
    });
    // Create Account

    const account = await Account.create({
      email: parsed?.contact?.email ?? undefined,
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
    const session = await mongoose.startSession();
    let patientNumber: number | undefined;

    try {
      await session.withTransaction(async () => {
        const user = new User({ ...userData });
        user.roles = [AccountRole.USER];
        await user.save({ session });

        const counter = await Counter.findByIdAndUpdate(
          'patientNumber',
          { $inc: { seq: 1 } },
          { new: true, upsert: true, session }
        );

        if (!counter) {
          throw new Error('Failed to generate patient number');
        }

        patientNumber = counter.seq;

        const socialHealthWorker = await User.findOne({
          roles: AccountRole.SOCIAL_HEALTH_WORKER,
          'address.village': userData.address.village,
        })
          .session(session)
          .lean();

        const clinicalProfilePayload: {
          userId: typeof user._id;
          patientNumber: number;
          healthWorkerId?: (typeof socialHealthWorker & { _id: unknown })['_id'];
        } = {
          userId: user._id,
          patientNumber,
        };

        if (socialHealthWorker?._id) {
          clinicalProfilePayload.healthWorkerId = socialHealthWorker._id;
        }

        await ClinicalProfile.create([clinicalProfilePayload], { session });
      });

      if (patientNumber === undefined) {
        throw new Error('Failed to register user');
      }

      return { patientNumber };
    } finally {
      await session.endSession();
    }
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

  async findUserDetailsByUserIdForAdmin(userId: string): Promise<any | null> {
    const user = await User.findById(userId);

    if (!user) {
      return null;
    }

    const account = await Account.findOne({ userId: user._id });

    return {
      user,
      account,
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
