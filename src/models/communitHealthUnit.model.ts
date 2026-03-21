import mongoose, { type Document, Schema, Types } from 'mongoose';
import type { ICommunityHealthUnit } from '../domain/communityHealthUnit.js';

export interface ICommunityHealthUnitDocument extends ICommunityHealthUnit, Document {}
export interface ICommunityHealthUnitModel extends mongoose.Model<ICommunityHealthUnitDocument> {}

const CommunityHealthUnitSchema = new Schema<ICommunityHealthUnitDocument>(
  {
    name: { type: String, trim: true, lowercase: true },
    socialHealthWorker: { type: Types.ObjectId, ref: 'User', required: false, default: null },
    healthCenter: { type: Types.ObjectId, ref: 'Hospital', required: true },
    address: {
      province: { type: String, required: true, trim: true, lowercase: true },
      district: { type: String, required: true, trim: true, lowercase: true },
      sector: { type: String, required: true, trim: true, lowercase: true },
      cell: { type: String, required: true, trim: true, lowercase: true },
      village: { type: String, required: true, trim: true, lowercase: true },
      _id: false,
    },
  },
  {
    timestamps: true,
  },
);

CommunityHealthUnitSchema.pre('save', async function () {
  if (this.isNew || this.isModified('address.village') || this.isModified('address.cell')) {
    this.name = `${this.address.village}-${this.address.cell}`;
  }
});

CommunityHealthUnitSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, __v, ...rest } = ret;
    return rest;
  },
});

// Prevent duplicate villages within the same cell
CommunityHealthUnitSchema.index(
  {
    'address.province': 1,
    'address.district': 1,
    'address.sector': 1,
    'address.cell': 1,
    'address.village': 1,
  },
  { unique: true },
);

const CommunityHealthUnit = mongoose.model<ICommunityHealthUnitDocument, ICommunityHealthUnitModel>(
  'CommunityHealthUnit',
  CommunityHealthUnitSchema,
);

export default CommunityHealthUnit;
