import mongoose, { type Model, Schema } from 'mongoose';
import type { IReferral } from '../domain/referral.js';
import { ModelNames } from '../constants/constant.values.js';

export interface IReferralDocument extends IReferral, Document {}
export interface IReferralModel extends Model<IReferralDocument> {}

const referralSchema = new Schema<IReferralDocument>(
  {
    userId: {
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

    referralDate: {
      type: Date,
      required: true,
      index: true,
    },

    to: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
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
      enum: ['PENDING', 'COMPLETED', 'CANCELLED', 'ESCALATED'],
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

    // Dynamic reference
    from: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'fromType',
    },

    // Tells mongoose which model to use
    fromType: {
      type: String,
      required: true,
      enum: [ModelNames.Hospital, ModelNames.CommunityHealthUnit],
    },
  },
  {
    timestamps: true,
  },
);

referralSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, __v, ...rest } = ret;
    return rest;
  },
});

const Referral = mongoose.model<IReferralDocument, IReferralModel>(ModelNames.Referral, referralSchema);

export default Referral;
