import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { AccountRole, type IAccount } from '../types/account.types.js';

// Move the schema definition here
export const accountSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phoneNumber: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
    roles: {
      type: [String],
      enum: Object.values(AccountRole),
      default: [AccountRole.USER],
    },
  },
  { timestamps: true }
);

accountSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    // Use rest properties to "omit" specific fields
    const { _id, password, __v, ...rest } = ret;
    return rest; // rest contains everything EXCEPT _id, password, and __v
  },
});

/**
 * Pre-save middleware to hash password
 * Note: Removed the 'next' parameter to avoid the "not callable" error.
 */
accountSchema.pre('save', async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return; // Just return; no next() needed in async hooks
  }

  try {
    const saltRounds = 10;
    // this.password is inferred from IAccount
    this.password = await bcrypt.hash(this.password, saltRounds);
  } catch (error: any) {
    // If you throw an error, Mongoose catches it and stops the save
    throw new Error(`Password hashing failed: ${error.message}`);
  }
});
// Create the model using the Schema and the Type
const Account = mongoose.model<IAccount>('Account', accountSchema);

export default Account;
