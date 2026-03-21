import mongoose, { Schema } from 'mongoose';
import { HospitalType, type IHospitalDocument } from '../types/hospital.types.js';
import type { Model, Types } from 'mongoose';
export interface IHospitalModel extends Model<IHospitalDocument> {
  existsById(id: Types.ObjectId): Promise<boolean>;
}
const hospitalSchema = new Schema<IHospitalDocument>(
  {
    name: { type: String, required: true, trim: true, lowercase: true },
    type: {
      type: String,
      required: true,
      enum: Object.values(HospitalType),
    },
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
    versionKey: false,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  },
);

// Static method
hospitalSchema.statics.existsById = async function (id: Types.ObjectId) {
  return this.exists({ _id: id }).then(Boolean);
};

const Hospital = mongoose.model<IHospitalDocument, IHospitalModel>('Hospital', hospitalSchema);

export default Hospital;
