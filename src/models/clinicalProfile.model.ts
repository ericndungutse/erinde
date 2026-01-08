import mongoose, { Schema } from 'mongoose';
import type { IClinicalProfile } from '../types/clinicalProfile.types.js';

const clinicalProfileSchema = new Schema<IClinicalProfile>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    patientNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
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
