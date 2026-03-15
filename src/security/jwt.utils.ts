import jwt, { type SignOptions } from 'jsonwebtoken';
import type { IAuthTokenPayload } from '../types/auth.types.js';

export const verifyToken = (token: string): IAuthTokenPayload => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Invalid token payload');
  }

  return decoded as IAuthTokenPayload;
};

export const generateToken = (payload: any, sub: string): string => {
  const secret = process.env.JWT_SECRET;

  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  if (!expiresIn) {
    throw new Error('JWT_EXPIRES_IN is not defined in environment variables');
  }

  const options: SignOptions = {
    expiresIn: expiresIn as any,
    subject: sub,
  };

  return jwt.sign({ ...payload, id: undefined }, secret, options);
};
