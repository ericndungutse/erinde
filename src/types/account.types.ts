import { Document, Model, Types } from 'mongoose';
import type { IUser, UserProjection } from './user.types.js';

// 1. Define the Methods
export interface IAccountMethods {
  getUser<T extends keyof IUser>(fields?: T[]): Promise<(UserProjection<T> & { id: string }) | null>;
}

// 2. Define the Document (Data + Methods)
// We extend Document to get Mongoose's built-in properties
export interface IAccountData {
  email: string;
  password: string;
  phoneNumber: string;
  isActive: boolean;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// 3. Define the Model type
export type IAccount = IAccountData & Document & IAccountMethods;
