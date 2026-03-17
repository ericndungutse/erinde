import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IClinicalProfile } from '../domain/clinical-profile.types.js';

export interface IClinicalProfileDocument extends IClinicalProfile, Document {}
export interface IClinicalProfileModel extends Model<IClinicalProfileDocument> {}

const clinicalProfileSchema = new Schema<IClinicalProfileDocument>(
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
  },
  { timestamps: true }
);

const ClinicalProfile = mongoose.model<IClinicalProfileDocument, IClinicalProfileModel>('ClinicalProfile', clinicalProfileSchema);
export default ClinicalProfile;
