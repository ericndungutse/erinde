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
  firstname: z.string().min(1, { message: 'First name is required' }),
  lastname: z.string().min(1, { message: 'Last name is required' }),
  birthdate: z.preprocess(
    (arg) => {
      if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
    },
    z.date({
      message: 'Birthdate is required',
    })
  ),
  address: z.object({
    province: z.string().min(1, { message: 'Province is required' }),
    district: z.string().min(1, { message: 'District is required' }),
    sector: z.string().min(1, { message: 'Sector is required' }),
    cell: z.string().min(1, { message: 'Cell is required' }),
    village: z.string().min(1, { message: 'Village is required' }),
  }),
  contact: z.object({
    phone: z
      .string()
      .min(10, { message: 'Phone number must be at least 10 characters' })
      .regex(/^\+?[0-9]+$/, { message: 'Invalid phone format' }),
    email: z.email({ message: 'Invalid email address' }),
  }),
  nationalIdentificationNumber: z
    .string()
    .length(16, { message: 'NIN must be exactly 16 characters' })
    .regex(/^[0-9]+$/, { message: 'NIN must contain only numbers' }),
});

export type RegisterUserResponse = {
  patientNumber: number;
};

// ZOD Schema
export const RegisterUserWithAccountSchema = RegisterUserSchema.extend({
  roles: z.preprocess(
    (val) => (val === undefined ? [] : val),
    z.array(AccountRoleSchema).min(1, { message: 'At least one role is required' })
  ),
});

// Infer the type from the schema to ensure they stay in sync
export type RegisterUserWithAccountDTO = z.infer<typeof RegisterUserWithAccountSchema>;
