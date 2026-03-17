import z from 'zod';
import { AddressSchema } from '../types/address.type.js';

export const CreateCommunityHealthUnitSchema = z.object({
  socialHealthWorker: z
    .string({ message: 'social_health_worker_is_required' })
    .min(1, { message: 'social_health_worker_is_required' }),
  healthCenter: z.string({ message: 'health_center_is_required' }).min(1, { message: 'health_center_is_required' }),
  address: AddressSchema,
});

export type CreateCommunityHealthUnitDTO = z.infer<typeof CreateCommunityHealthUnitSchema>;