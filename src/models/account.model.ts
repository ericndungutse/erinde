import bcrypt from 'bcrypt';
import mongoose, { Schema } from 'mongoose';
import { type IAccount } from '../types/account.types.js';
import User from './user.model.js';
import type { IUser, UserProjection } from '../types/user.types.js';

// Move the schema definition here
export const accountSchema = new Schema<IAccount>(
  {
    email: { type: String, required: false, lowercase: true, trim: true},
    password: { type: String, required: true, minlength: 6 },
    phoneNumber: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

accountSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } }
  }
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

accountSchema.methods.getUser = async function <T extends keyof IUser>(
  fields?: T[]
): Promise<(UserProjection<T> & { id: string }) | null> {
  const userId = this.userId;

  if (!userId) return null;

  // Build Mongoose projection
  let projection: any = {};
  if (fields && fields.length > 0) {
    fields.forEach((field) => {
      projection[field] = 1;
    });
  }

  // Always include _id so we can map it to `id`
  projection._id = 1;

  const userDoc = await User.findById(userId, projection).exec();

  if (!userDoc) return null;

  // Map _id to id
  const { _id, ...rest } = userDoc.toObject();

  return { ...rest, id: _id.toString() } as UserProjection<T> & { id: string };
};

// Create the model using the Schema and the Type
const Account = mongoose.model<IAccount>('Account', accountSchema);

export default Account;
