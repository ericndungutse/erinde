import type { Types } from 'mongoose';
import type { IAddress } from '../types/address.type.js';

export interface ICommunityHealthUnit {
  id?: string;
  name: string;
  socialHealthWorker: string | Types.ObjectId | null;
  // Health Center where patient from this community get reffered to
  healthCenter: string | Types.ObjectId;
  address: IAddress;
}
