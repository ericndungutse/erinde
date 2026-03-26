import mongoose, { Schema } from 'mongoose';
import type { Model } from 'mongoose';
import type { IAssessment, IAssessmentClassification, IAssessmentReading } from '../domain/assessment.js';
import { ModelNames } from '../constants/constant.values.js';

export interface IAssessmentDocument extends IAssessment, Document {}
export interface IAssessmentModel extends Model<IAssessmentDocument> {}

/**
 * Subdocument: single reading
 */
const AssessmentReadingSchema = new Schema<IAssessmentReading>(
  {
    value: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

/**
 * Subdocument: classification
 */
const AssessmentClassificationSchema = new Schema<IAssessmentClassification>(
  {
    label: {
      type: String,
      required: true,
    },
    status_code: {
      type: String,
      enum: ['healthy', 'warning', 'danger', 'critical'],
      required: true,
      index: true,
    },
  },
  { _id: false },
);

/**
 * Main Assessment Result Schema
 */
const AssessmentResultSchema = new Schema<IAssessmentDocument>(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    indicator: {
      type: Schema.Types.ObjectId,
      ref: 'Indicator',
      required: true,
      index: true,
    },

    evaluatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      // required: true,
    },

    /**
     * Dynamic readings map
     */
    readings: {
      type: Map,
      of: AssessmentReadingSchema,
      required: true,
    },

    classification: {
      type: AssessmentClassificationSchema,
      // required: true,
    },

    patientNumber: {
      type: Number,
      required: true,
    },

    recommendations: {
      type: [String],
      default: [],
    },

    evaluatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    takenFrom: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'takenFromType',
    },

    takenFromType: {
      type: String,
      required: true,
      enum: [ModelNames.Hospital, ModelNames.CommunityHealthUnit],
    },

    evaluatedDate: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      },
      index: true,
    },
  },

  {
    timestamps: true,
    toJSON: {
      flattenMaps: true,
    },
    toObject: {
      flattenMaps: true,
    },
  },
);

/**
 * Helpful compound index
 * One indicator per patient per time window (optional)
 */
AssessmentResultSchema.index({ patient: 1, evaluatedAt: -1 });

AssessmentResultSchema.index({ patient: 1, indicator: 1, evaluatedDate: 1 }, { unique: true });

export const Assessment = mongoose.model<IAssessmentDocument, IAssessmentModel>(
  ModelNames.Assessment,
  AssessmentResultSchema,
);
