import type { InferSchemaType } from 'mongoose';
import type { userSchema } from '../models/user.model.js';
import z from 'zod';

// Infer the type from the schema
export type IUser = InferSchemaType<typeof userSchema>;

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
  email: string;
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
