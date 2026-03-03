import type { InferSchemaType, Types } from 'mongoose';
import type { userSchema } from '../models/user.model.js';
import z from 'zod';


export interface IUserData {
  contact: IContact;
  nationalIdentificationNumber: string;
  roles: AccountRole[];
  address: IAddress;
  birthdate: Date;
  firstname: string;
  lastname: string;
  createdAt: Date;
  updatedAt: Date;
}

// Address type
export interface IAddress {
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
}

// Contact type
export interface IContact {
  phone: string;
  email: string | undefined;
}

export type ILoggedInUser = Pick<IUser, 'roles'> & {
  id: string;
};

export enum AccountRole {
  SCREENING_VOLUNTEER = 'SCREENING_VOLUNTEER',
  SOCIAL_HEALTH_WORKER = 'SOCIAL_HEALTH_WORKER',
  NURSE = 'NURSE',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

// Simplest version if you just want one message for any failure
export const AccountRoleSchema = z.enum(['SCREENING_VOLUNTEER', 'SOCIAL_HEALTH_WORKER', 'USER', 'ADMIN', 'NURSE'], {
  message: 'Please select a valid account role',
});

export type UserRoles = Pick<IUser, 'roles'> & {
  id: string;
};

export type UserProjection<T extends keyof IUser> = Pick<IUser, T>;


export type IUser = IUserData & Document;