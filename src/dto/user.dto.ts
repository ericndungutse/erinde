import z from 'zod';
import type { IUser } from '../domain/user.js';

export type ILoggedInUser = Pick<IUser, 'roles'> & {
  id: string;
};

// Simplest version if you just want one message for any failure
export const UserRoleSchema = z.enum(['SCREENING_VOLUNTEER', 'SOCIAL_HEALTH_WORKER', 'USER', 'ADMIN', 'NURSE'], {
  message: 'Please select a valid user role',
});

export type UserRoles = Pick<IUser, 'roles'> & {
  id: string;
};

export type UserProjection<T extends keyof IUser> = Pick<IUser, T>;

export interface IAdminUpdateUserPasswordPayload {
  password: string;
}

export const AdminUpdateUserPasswordSchema = z.object({
  password: z.string({ message: 'Password is required' }).min(6, 'Password must be at least 6 characters long'),
}) satisfies z.ZodType<IAdminUpdateUserPasswordPayload>;

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
    email: z.string({ message: 'Email is required' }).email({ message: 'Invalid email address' }).optional(),
  }),
  nationalIdentificationNumber: z
    .string({ message: 'National Identification Number is required' })
    .length(16, { message: 'National Identification Number must be exactly 16 characters' })
    .regex(/^[0-9]+$/, { message: 'National Identification Number must contain only numbers' }),
});

// ZOD Schema
export const RegisterUserWithAccountSchema = RegisterUserSchema.extend({
  roles: z.preprocess(
    (val) => (val === undefined ? [] : val),
    z.array(UserRoleSchema).min(1, { message: 'At least one role is required' }),
  ),
  hospitalId: z.string().optional(),
}).superRefine((data, ctx) => {
  const roles = data.roles as string[];
  if (roles.includes('NURSE') && !data.hospitalId) {
    ctx.addIssue({
      path: ['hospitalId'],
      message: 'hospital_id_required',
      code: 'custom',
    });
  }
});

export type RegisterUserResponse = {
  patientNumber: number;
};

// Infer the type from the schema to ensure they stay in sync
export type RegisterUserWithAccountDTO = z.infer<typeof RegisterUserWithAccountSchema>;
export type RegisterUserDTO = z.infer<typeof RegisterUserSchema>;
