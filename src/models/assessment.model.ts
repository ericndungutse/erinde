import mongoose, { Schema } from 'mongoose';
import {
  type IAssessmentClassification,
  type IAssessmentReading,
  type IAssessment,
} from '../types/assessment.types.js';

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
  { _id: false }
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
  { _id: false }
);

/**
 * Main Assessment Result Schema
 */
const AssessmentResultSchema = new Schema<IAssessment>(
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

    recommendations: {
      type: [String],
      default: [],
    },

    evaluatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Helpful compound index
 * One indicator per patient per time window (optional)
 */
AssessmentResultSchema.index({ patient: 1, evaluatedAt: -1 });

const Assessment = mongoose.model<IAssessment>('Assessment', AssessmentResultSchema);
export default Assessment;
