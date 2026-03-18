import mongoose from "mongoose";
import { ConstantValues } from "../constants/constant.values.js";
import UserNotFoundError from "../Errors/UserNotFoundError.js";
import Account from "../models/account.model.js";
import ClinicalProfile from "../models/clinicalProfile.model.js";
import Counter from "../models/counter.model.js";
import User, {
  Nurse,
  type INurseDocument,
  type IUserDocument,
} from "../models/user.model.js";

import {
  RegisterUserWithAccountSchema,
  type GetAllUsersResult,
  type IAdminUpdateUserPasswordPayload,
  type RegisterUserDTO,
  type RegisterUserResponse,
  type RegisterUserWithAccountDTO,
  type UserRoles,
} from "../dto/user.dto.js";
import CommunityHealthUnitNotFoundError from "../Errors/CommunityHealthUnitNotFoundError.js";
import HospitalNotFoundError from "../Errors/HospitalNotFoundError.js";
import CommunityHealthUnit from "../models/communitHealthUnit.model.js";
import Hospital from "../models/hospital.model.js";
import type { PaginationMeta } from "../types/api.types.js";
import { UserRole } from "../types/roles.types.js";
import { APIFeatures } from "../utils/apiFeatures.js";
import { parsePaginationParams } from "../utils/pagination.js";
import type { IUserService } from "./interface/iuser.service.js";
import type { IClinicalProfile } from "../domain/clinical-profile.types.js";
export class UserService implements IUserService {
  async getAllUsers(
    queryString: Record<string, string | string[] | undefined>,
  ): Promise<GetAllUsersResult> {
    const { page, limit } = parsePaginationParams(queryString);

    const features = new APIFeatures(User.find(), queryString)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const countFeatures = new APIFeatures(User.find(), queryString).filter();

    const filteredQuery = countFeatures.query.getFilter() as any;
    const [users, totalResults] = await Promise.all([
      features.query.lean(),
      User.countDocuments(filteredQuery as any),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalResults / limit));
    const currentPage = Math.min(page, totalPages);

    const pagination: PaginationMeta = {
      currentPage,
      perPage: limit,
      totalResults,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
      prevPage: currentPage > 1 ? currentPage - 1 : null,
    };

    return {
      users,
      pagination,
    };
  }
  async registerUserWithAccount(
    userData: RegisterUserWithAccountDTO,
  ): Promise<any> {
    const parsed = RegisterUserWithAccountSchema.parse(userData);
    const roles = [UserRole.USER, ...(parsed.roles as UserRole[])];

    if (!mongoose.isValidObjectId(parsed.communityHealthUnit)) {
      throw new CommunityHealthUnitNotFoundError();
    }

    const communityHealthUnitExists = await CommunityHealthUnit.exists({
      _id: new mongoose.Types.ObjectId(parsed.communityHealthUnit),
    });

    if (!communityHealthUnitExists) {
      throw new CommunityHealthUnitNotFoundError();
    }

    const session = await mongoose.startSession();
    let user: IUserDocument | INurseDocument | undefined;
    let account;
    let clinicalProfile;

    // -------------------------
    // Role-specific validation
    // -------------------------
    const hasNurseRole = roles.includes(UserRole.NURSE);
    if (hasNurseRole) {
      if (!parsed.hospitalId) throw new Error("hospital_id_required");

      const exists = await Hospital.existsById(
        new mongoose.Types.ObjectId(parsed.hospitalId),
      );
      if (!exists) throw new HospitalNotFoundError();
    }

    try {
      await session.withTransaction(async () => {
        user = this.createUserByRole(parsed, roles);
        await user.save({ session });

        account = new Account({
          email: parsed?.contact?.email ?? undefined,
          phoneNumber: parsed.contact.phone,
          password: ConstantValues.DEFAULT_PASSWORD,
          userId: user._id,
          mustChangePassword: true,
        });
        await account.save({ session });

        const counter = await Counter.findByIdAndUpdate(
          "patientNumber",
          { $inc: { seq: 1 } },
          { new: true, upsert: true, session },
        );

        if (!counter) {
          throw new Error("Failed to generate patient number");
        }

        clinicalProfile = new ClinicalProfile({
          userId: user._id,
          patientNumber: counter.seq,
        });
        await clinicalProfile.save({ session });
      });

      if (!user || !account || !clinicalProfile) {
        throw new Error("Failed to register user with account");
      }

      return { user, account, clinicalProfile };
    } finally {
      await session.endSession();
    }
  }

  async updateUserPasswordByAdmin(
    userId: string,
    payload: IAdminUpdateUserPasswordPayload,
  ): Promise<void> {
    if (!mongoose.isValidObjectId(userId)) {
      throw new UserNotFoundError();
    }

    const account = await Account.findOne({ userId });

    if (!account) {
      throw new UserNotFoundError();
    }

    account.password = payload.password;
    account.mustChangePassword = true;
    await account.save();
  }

  async registerUser(userData: RegisterUserDTO): Promise<RegisterUserResponse> {
    if (!mongoose.isValidObjectId(userData.communityHealthUnit)) {
      throw new CommunityHealthUnitNotFoundError();
    }

    const communityHealthUnitExists = await CommunityHealthUnit.exists({
      _id: new mongoose.Types.ObjectId(userData.communityHealthUnit),
    });

    if (!communityHealthUnitExists) {
      throw new CommunityHealthUnitNotFoundError();
    }

    const session = await mongoose.startSession();
    let patientNumber: number | undefined;

    try {
      await session.withTransaction(async () => {
        const user = new User({ ...userData });
        user.roles = [UserRole.USER];
        await user.save({ session });

        const counter = await Counter.findByIdAndUpdate(
          "patientNumber",
          { $inc: { seq: 1 } },
          { new: true, upsert: true, session },
        );

        if (!counter) {
          throw new Error("Failed to generate patient number");
        }

        patientNumber = counter.seq;

        const clinicalProfilePayload: IClinicalProfile = {
          userId: user._id,
          patientNumber,
        };

        await ClinicalProfile.create([clinicalProfilePayload], { session });
      });

      if (patientNumber === undefined) {
        throw new Error("Failed to register user");
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

  async findUserByPatientNumber(
    patientNumber: number,
    session?: any,
  ): Promise<any | null> {
    const clinicalProfile = await ClinicalProfile.findOne(
      { patientNumber },
      {},
      { session },
    )
      .populate({
        path: "userId",
        select:
          "firstname lastname nationalIdentificationNumber contact.phone address.district",
      })
      .lean();

    if (!clinicalProfile || !clinicalProfile.userId) {
      return null;
    }

    const user: any = clinicalProfile.userId;

    return {
      id: user._id.toString(),
      nationalIdentificationNumber: user.nationalIdentificationNumber,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.contact?.phone,
      district: user.address?.district,
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
      roles: UserRole.SOCIAL_HEALTH_WORKER,
      "address.village": village,
    }).lean();

    if (!socialHealthWorker) {
      return null;
    }

    return socialHealthWorker;
  }

  createUserByRole(
    parsed: any,
    roles: string[],
  ): IUserDocument | INurseDocument {
    // If the user is a Nurse, use the Nurse discriminator
    if (roles.includes(UserRole.NURSE)) {
      if (!parsed.hospitalId) {
        throw new Error("hospitalId is required for a Nurse");
      }
      return new Nurse({
        ...parsed,
        roles,
        hospitalId: parsed.hospitalId,
        contact: {
          email: parsed.contact?.email ?? undefined,
          phone: parsed.contact.phone,
        },
      });
    }

    // Default to regular User
    return new User({
      ...parsed,
      roles,
      contact: {
        email: parsed.contact?.email ?? undefined,
        phone: parsed.contact.phone,
      },
    });
  }
}
