import mongoose, { Schema } from 'mongoose';
import type { IClinicalProfile } from '../types/clinical-profile.types.js';

const clinicalProfileSchema = new Schema<IClinicalProfile>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    patientNumber: {
      type: Number,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    healthWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

const ClinicalProfile = mongoose.model<IClinicalProfile>('ClinicalProfile', clinicalProfileSchema);
export default ClinicalProfile;
