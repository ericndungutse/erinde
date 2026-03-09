import mongoose, { Schema } from "mongoose";
import {
  HospitalType,
  type IHospitalDocument,
} from "../types/hospital.types.js";

const hospitalSchema = new Schema<IHospitalDocument>(
  {
    name: { type: String, required: true, trim: true },
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
  { timestamps: true },
);

hospitalSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, __v, ...rest } = ret;
    return rest;
  },
});

const Hospital = mongoose.model<IHospitalDocument>("Hospital", hospitalSchema);

export default Hospital;
