import mongoose, { Schema } from 'mongoose';
import { type IReferral } from '../types/referral.types.js';

const ReferralSchema = new Schema<IReferral>(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    patientNumber: {
      type: Number,
      required: true,
      index: true,
    },

    clinicalProfile: {
      type: Schema.Types.ObjectId,
      ref: 'ClinicalProfile',
      required: true,
      index: true,
    },

    referralDate: {
      type: Date,
      required: true,
      index: true,
    },

    visitDate: {
      type: Date,
    },

    scheduledVisitDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },

    assessments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true,
      },
    ],

    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

ReferralSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, __v, ...rest } = ret;
    return rest;
  },
});

const Referral = mongoose.model<IReferral>('Referral', ReferralSchema);

export default Referral;
