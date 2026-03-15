import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { APIFeatures } from '../../utils/apiFeatures.js';
import { setupTestDB } from './mongo-memory.js';

type ApiFeatureRecord = {
  name: string;
  score: number;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
};

type ApiFeatureLean = ApiFeatureRecord & {
  _id: Types.ObjectId;
  __v?: number;
};

const apiFeatureSchema = new Schema<ApiFeatureRecord>(
  {
    name: { type: String, required: true },
    score: { type: Number, required: true },
    roles: [{ type: String, required: true }],
  },
  { timestamps: true },
);

const ApiFeatureModel =
  (mongoose.models.ApiFeatureRecord as Model<ApiFeatureRecord> | undefined) ??
  mongoose.model<ApiFeatureRecord>('ApiFeatureRecord', apiFeatureSchema);

setupTestDB();

describe('APIFeatures integration', () => {
  it('applies filter, sort, and paginate on a real Mongoose query', async () => {
    await ApiFeatureModel.insertMany([
      { name: 'Aline', score: 15, roles: ['USER'] },
      { name: 'Beata', score: 20, roles: ['USER'] },
      { name: 'Chantal', score: 30, roles: ['ADMIN'] },
      { name: 'Diane', score: 40, roles: ['ADMIN'] },
      { name: 'Elisa', score: 50, roles: ['ADMIN'] },
    ]);

    const features = new APIFeatures(ApiFeatureModel.find(), {
      roles: 'ADMIN',
      sort: 'score',
      page: '2',
      limit: '2',
    })
      .filter()
      .sort()
      .paginate();

    const results = (await features.query.lean()) as ApiFeatureLean[];

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('Elisa');
    expect(results[0]?.score).toBe(50);
  });

  it('supports explicit field selection via limitFields', async () => {
    await ApiFeatureModel.create({
      name: 'Field Test',
      score: 99,
      roles: ['USER'],
    });

    const features = new APIFeatures(ApiFeatureModel.find(), {
      fields: 'name,score',
    }).limitFields();

    const results = (await features.query.lean()) as ApiFeatureLean[];

    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('name', 'Field Test');
    expect(results[0]).toHaveProperty('score', 99);
    expect(results[0]).not.toHaveProperty('roles');
  });

  it('excludes __v by default when no fields query is provided', async () => {
    await ApiFeatureModel.create({
      name: 'Default Fields',
      score: 45,
      roles: ['USER'],
    });

    const features = new APIFeatures(ApiFeatureModel.find(), {}).limitFields();

    const results = (await features.query.lean()) as ApiFeatureLean[];

    expect(results).toHaveLength(1);
    expect(results[0]).not.toHaveProperty('__v');
    expect(results[0]).toHaveProperty('roles');
  });

  it('sanitizes invalid pagination values to safe minimums', async () => {
    await ApiFeatureModel.insertMany([
      { name: 'P1', score: 1, roles: ['USER'] },
      { name: 'P2', score: 2, roles: ['USER'] },
      { name: 'P3', score: 3, roles: ['USER'] },
    ]);

    const features = new APIFeatures(ApiFeatureModel.find(), {
      sort: 'score',
      page: '-5',
      limit: '0',
    })
      .sort()
      .paginate();

    const results = (await features.query.lean()) as ApiFeatureLean[];

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('P1');
  });
});
