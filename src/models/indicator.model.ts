import mongoose, { Schema } from 'mongoose';
import { type IIndicator } from '../types/indicator.types.js';

export const indicatorSchema = new Schema<IIndicator>(
  {
    name: { type: String, required: true, trim: true },
    readings: [
      {
        type: { type: String, required: true },
        unit: { type: String, required: true },
        _id: false,
      },
    ],
    classifications: [
      {
        sstatus_code: {
          type: String,
          required: true,
          enum: ['healthy', 'warning', 'danger', 'critical'],
        },
        label: { type: String, required: true },
        min_systolic: { type: Number },
        max_systolic: { type: Number },
        min_diastolic: { type: Number },
        max_diastolic: { type: Number },
        // For BMI
        min_value: { type: Number },
        max_value: { type: Number },
        logic: { type: String, enum: ['OR', 'AND'] },
        recommendations: [{ type: String }],
        _id: false,
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

indicatorSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, __v, ...rest } = ret;
    return rest;
  },
});

const Indicator = mongoose.model<IIndicator>('Indicator', indicatorSchema);
export default Indicator;
