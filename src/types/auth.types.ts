import z from 'zod';
import type { IAccount } from './account.types.js';
import type { IUser } from './user.types.js';

export interface ILoginPayload {
  identifier: string; // email, or phone number
  password: string;
}

export const LoginSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
}) satisfies z.ZodType<ILoginPayload>;

export type ILoggedInUser = Pick<IUser, 'roles'> & {
  id: string;
};

export interface ILoginResponse {
  token: string;
  user: ILoggedInUser;
  activeRole?: string;
}
