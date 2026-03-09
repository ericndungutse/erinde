import type { Types } from 'mongoose';
import type { IUser } from './user.js';

export interface INurse extends IUser {
  // Not Types.ObjectId to adhere to DDD principles
  hospitalId: string | Types.ObjectId;
}
