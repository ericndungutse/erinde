import type { InferSchemaType } from 'mongoose';
import type { userSchema } from '../models/user.model.js';

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
  USER = 'USER',
}

export type UserRoles = Pick<IUser, 'roles'> & {
  id: string;
};

export type UserProjection<T extends keyof IUser> = Pick<IUser, T>;
