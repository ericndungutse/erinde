import type { InferSchemaType } from 'mongoose';
import { z } from 'zod';

import type { accountSchema } from '../models/account.model.js';

export type IAccount = InferSchemaType<typeof accountSchema>;

// 1. Define the Enum (The source of truth)
export enum AccountRole {
  SCREENING_VOLUNTEER = 'SCREENING_VOLUNTEER',
  SOCIAL_HEALTH_WORKER = 'SOCIAL_HEALTH_WORKER',
  USER = 'USER',
}

// 2. Authenticate

// Interface: Extendable if new things come up
export interface IAuthenticatePayload {
  identifier: string; // username, email, or phone number
  password: string;
}

export const AuthenticateSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
}) satisfies z.ZodType<IAuthenticatePayload>;
