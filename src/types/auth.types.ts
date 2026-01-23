import z from 'zod';
import type { IUser } from './user.types.js';

export interface ILoginPayload {
  identifier: string; // email, or phone number
  password: string;
}

export const LoginSchema = z.object({
  identifier: z.string({ message: 'Email or phone number is required' }).min(1, 'Email or phone number is required'),
  password: z.string({ message: 'Password is required' }).min(6, 'Password must be at least 6 characters long'),
}) satisfies z.ZodType<ILoginPayload>;

export type ILoggedInUser = Pick<IUser, 'roles'> & {
  id: string;
};

export interface ILoginResponse {
  token: string;
  user: ILoggedInUser;
  activeRole?: string;
}
