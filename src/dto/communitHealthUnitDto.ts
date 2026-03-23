import z from 'zod';
import { AddressSchema } from '../types/address.type.js';
import type { ICommunityHealthUnit } from '../domain/communityHealthUnit.js';
import type { PaginationMeta } from '../types/api.types.js';
import { RegisterUserSchema } from './user.dto.js';
import { UserRole } from '../types/roles.types.js';

const NewSocialHealthWorkerSchema = RegisterUserSchema.omit({
  communityHealthUnit: true,
}).extend({
  roles: z.array(z.literal(UserRole.SOCIAL_HEALTH_WORKER)).optional(),
});

export const CreateCommunityHealthUnitSchema = z.object({
  socialHealthWorker: z.union([
    z.string().min(1, { message: 'social_health_worker_is_required' }),
    NewSocialHealthWorkerSchema,
  ]),
  healthCenter: z.string({ message: 'health_center_is_required' }).min(1, { message: 'health_center_is_required' }),
  address: AddressSchema,
});

export type CreateCommunityHealthUnitDTO = z.infer<typeof CreateCommunityHealthUnitSchema>;

export interface GetAllCommunityHealthUnitsResult {
  communityHealthUnits: ICommunityHealthUnit[];
  pagination: PaginationMeta;
}