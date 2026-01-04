import mongoose, { Schema } from 'mongoose';
import type { IUser } from '../types/user.types.js';
import { AccountRole } from '../types/account.types.js';
// Define the User schema
export const userSchema = new Schema(
  {
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    birthdate: { type: Date, required: true },
    address: {
      province: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      sector: { type: String, required: true, trim: true },
      cell: { type: String, required: true, trim: true },
      village: { type: String, required: true, trim: true },
      _id: false,
    },
    contact: {
      phone: { type: String, required: true, trim: true, unique: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      _id: false,
    },
    nationalIdentificationNumber: { type: String, required: true, unique: true, trim: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    roles: {
      type: [String],
      enum: Object.values(AccountRole),
      default: [AccountRole.USER],
    },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, __v, ...rest } = ret;
    return rest;
  },
});

// Create and export the model
const User = mongoose.model<IUser>('User', userSchema);

export default User;
