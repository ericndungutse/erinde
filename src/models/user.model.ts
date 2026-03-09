import mongoose, { Document, Schema } from 'mongoose';
import type { IUser } from '../domain/user.js';
import { UserRole } from '../types/roles.types.js';
// Define the User schema

export interface IUserDocument extends IUser, Document {}

export const userSchema = new Schema<IUserDocument>(
  {
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    birthdate: { type: Date, required: true },
    address: {
      province: { type: String, required: true, trim: true, lowercase: true },
      district: { type: String, required: true, trim: true, lowercase: true },
      sector: { type: String, required: true, trim: true, lowercase: true },
      cell: { type: String, required: true, trim: true, lowercase: true },
      village: { type: String, required: true, trim: true, lowercase: true },
      _id: false,
    },
    contact: {
      phone: { type: String, required: true, trim: true, unique: true },
      email: { type: String, required: false, unique: true, lowercase: true, trim: true, sparse: true },
      _id: false,
    },
    nationalIdentificationNumber: { type: String, required: true, unique: true, trim: true },
    roles: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.USER],
    },
  },
  { timestamps: true },
);

userSchema.index(
  { 'address.village': 1 },
  {
    unique: true,
    partialFilterExpression: {
      roles: UserRole.SOCIAL_HEALTH_WORKER,
    },
  },
);

// Only one social health worker per village
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, __v, ...rest } = ret;
    return rest;
  },
});

// Create and export the model
const User = mongoose.model<IUserDocument>('User', userSchema);

export default User;
