import { z } from 'zod';
import { Types } from 'mongoose';
import { AccountRole, AccountRoleSchema } from './user.types.js';
export interface RegisterUserDTO {
  firstname: string;
  lastname: string;
  birthdate: Date | string;
  address: {
    province: string;
    city: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  nationalIdentificationNumber: string;
}

export const RegisterUserSchema = z.object({
  firstname: z.string({ message: 'First name is required' }).min(1, { message: 'First name is required' }),
  lastname: z.string({ message: 'Last name is required' }).min(1, { message: 'Last name is required' }),
  birthdate: z.preprocess(
    (arg) => {
      if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
    },
    z.date({
      message: 'Birthdate is required',
    }),
  ),
  address: z.object({
    province: z.string({ message: 'Province is required' }).min(1, { message: 'Province is required' }),
    district: z.string({ message: 'District is required' }).min(1, { message: 'District is required' }),
    sector: z.string({ message: 'Sector is required' }).min(1, { message: 'Sector is required' }),
    cell: z.string({ message: 'Cell is required' }).min(1, { message: 'Cell is required' }),
    village: z.string({ message: 'Village is required' }).min(1, { message: 'Village is required' }),
  }),
  contact: z.object({
    phone: z
      .string({ message: 'Phone number is required' })
      .min(10, { message: 'Phone number must be at least 10 characters' })
      .max(10, { message: 'Phone number must be at most 10 characters' })
      .regex(/^\+?[0-9]+$/, { message: 'Phone number must contain only numbers' }),
    email: z.string({ message: 'Email is required' }).email({ message: 'Invalid email address' }),
  }),
  nationalIdentificationNumber: z
    .string({ message: 'National Identification Number is required' })
    .length(16, { message: 'National Identification Number must be exactly 16 characters' })
    .regex(/^[0-9]+$/, { message: 'National Identification Number must contain only numbers' }),
});

export type RegisterUserResponse = {
  patientNumber: number;
};

// ZOD Schema
export const RegisterUserWithAccountSchema = RegisterUserSchema.extend({
  roles: z.preprocess(
    (val) => (val === undefined ? [] : val),
    z.array(AccountRoleSchema).min(1, { message: 'At least one role is required' }),
  ),
});

// Infer the type from the schema to ensure they stay in sync
export type RegisterUserWithAccountDTO = z.infer<typeof RegisterUserWithAccountSchema>;
