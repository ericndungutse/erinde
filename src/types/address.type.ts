import { z } from 'zod';

export const AddressSchema = z.object({
  province: z.string({ message: 'province_is_required' }).min(3, 'province_must_be_at_least_3_characters_long'),
  district: z.string({ message: 'district_is_required' }).min(3, 'district_must_be_at_least_3_characters_long'),
  sector: z.string({ message: 'sector_is_required' }).min(3, 'sector_must_be_at_least_3_characters_long'),
  cell: z.string({ message: 'cell_is_required' }).min(3, 'cell_must_be_at_least_3_characters_long'),
  village: z.string({ message: 'village_is_required' }).min(3, 'village_must_be_at_least_3_characters_long'),
});

export type IAddress = z.infer<typeof AddressSchema>;