import z from 'zod';
import type { JwtPayload } from 'jsonwebtoken';
import type { IUser } from '../domain/user.js';

export interface ILoginPayload {
  identifier: string; // email, or phone number
  password: string;
}

export const LoginSchema = z.object({
  identifier: z.string({ message: 'Email or phone number is required' }).min(1, 'Email or phone number is required'),
  password: z.string({ message: 'password_required' }).min(6, 'Password must be at least 6 characters long'),
}) satisfies z.ZodType<ILoginPayload>;

export type ILoggedInUser = Pick<IUser, 'roles' | 'communityHealthUnit'> & {
  id: string;
  hospitalId?: string | undefined;
  managedCommunityHealthUnit?: {
    id: string;
    name: string;
  } | undefined;
};

export interface IAuthTokenPayload extends JwtPayload {
  sub: string;
  accountId: string;
  email?: string | undefined;
  roles: string[];
  hospitalId?: string | undefined;
}

export interface ILoginResponse {
  token: string;
  user: ILoggedInUser;
  activeRole?: string;
}
