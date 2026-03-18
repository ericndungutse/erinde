import type { Types } from 'mongoose';
import type { IAddress } from '../types/address.type.js';
import type { Contact } from '../types/contact.type.js';
import type { UserRole } from '../types/roles.types.js';

export interface IUser {
  contact: Contact;
  nationalIdentificationNumber: string;
  roles: UserRole[];
  address: IAddress;
  birthdate: Date;
  firstname: string;
  lastname: string;
  communityHealthUnit: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}
