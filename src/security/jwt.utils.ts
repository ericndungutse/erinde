import jwt, { type SignOptions } from 'jsonwebtoken';

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET as string);
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
    subject: payload['id']?.toString(),
  };

  return jwt.sign({ ...payload, id: undefined }, secret, options);
};
