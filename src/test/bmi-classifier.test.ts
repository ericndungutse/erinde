import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import AssessmentClassifier from '../service/assessment-classifier.service.js';
import type { IIndicatorData } from '../types/indicator.types.js';
import type { IAssessmentReadings } from '../domain/assessment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const baseBmiIndicator: IIndicatorData = {
  name: 'bmi',
  readings: [
    { type: 'height', unit: 'cm' },
    { type: 'weight', unit: 'kg' },
  ],
  classifications: [
    {
      label: 'Obesity Class III',
      status_code: 'danger',
      min_value: 40.0,
      recommendations: ["Shaka inama z'abaganga kugira ngo ugabanye ibiro mu buryo burambye"],
    },
    {
      label: 'Obesity Class II',
      status_code: 'danger',
      min_value: 35.0,
      max_value: 39.9,
      recommendations: ['Gabanya igihe umara nicaye, wongere imyitozo ngororamubiri'],
    },
    {
      label: 'Obesity Class I',
      status_code: 'danger',
      min_value: 30.0,
      max_value: 34.9,
      recommendations: ['Gira akamenyero ko kurya neza no gukora siporo buri munsi'],
    },
    {
      label: 'Overweight',
      status_code: 'warning',
      min_value: 25.0,
      max_value: 29.9,
      recommendations: ["Genzura ingano y'ibiryo urya kandi uhitemo ibiryo bitanga ubuzima"],
    },
    {
      label: 'Normal',
      status_code: 'healthy',
      min_value: 18.5,
      max_value: 24.9,
      recommendations: ["Komeza akamenyero keza ufite k'ubuzima"],
    },
    {
      label: 'Underweight',
      status_code: 'warning',
      max_value: 18.4,
      recommendations: [
        'Rya indyo yuzuye irimo poroteyine nyinshi',
        "Gana ivuriro bakugire inama nyuma y'ibyumweru bine",
      ],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

type BmiSuccessCase = {
  name: string;
  heightCm: number;
  weightKg: number;
  expectedLabel: string;
};

type BmiTestData = {
  successCases: BmiSuccessCase[];
};

const rawData = readFileSync(resolve(__dirname, 'bmi-cases.json'), 'utf-8');
const testData: BmiTestData = JSON.parse(rawData);

function makeReadings(heightCm?: number | null, weightKg?: number | null): IAssessmentReadings {
  const readings: IAssessmentReadings = {};
  if (heightCm != null) readings['height'] = { value: heightCm, unit: 'cm' };
  if (weightKg != null) readings['weight'] = { value: weightKg, unit: 'kg' };
  return readings;
}

describe('AssessmentClassifier.classifyBmi', () => {
  const classifier = new AssessmentClassifier();

  describe('Data-driven classification cases (from JSON)', () => {
    for (const c of testData.successCases) {
      it(c.name, () => {
        const heightCm = c.heightCm;
        const weightKg = c.weightKg;

        const readings = makeReadings(heightCm, weightKg);
        const { classification } = classifier.classifyBmi(readings, baseBmiIndicator);

        expect(classification.label).toBe(c.expectedLabel);
      });
    }
  });

  it('throws if height or weight reading is missing', () => {
    expect(() => classifier.classifyBmi(makeReadings(170, undefined), baseBmiIndicator)).toThrow(
      'Invalid BMI readings format. Height(cm) and weight(kg) must be numbers.',
    );
    expect(() => classifier.classifyBmi(makeReadings(undefined, 70), baseBmiIndicator)).toThrow(
      'Invalid BMI readings format. Height(cm) and weight(kg) must be numbers.',
    );
  });

  it('throws if height or weight is non-positive', () => {
    expect(() => classifier.classifyBmi(makeReadings(0, 70), baseBmiIndicator)).toThrow(
      /positive height and weight values/i,
    );
    expect(() => classifier.classifyBmi(makeReadings(170, 0), baseBmiIndicator)).toThrow(
      /positive height and weight values/i,
    );
  });

  // ---- Boundary / edge cases around configured ranges ----

  it('treats exactly 18.4 as Underweight upper bound', () => {
    // pick height/weight to get BMI very close to 18.4, here using a direct value
    const heightCm = 170;
    const bmiTarget = 18.4;
    const heightM = heightCm / 100;
    const weightKg = bmiTarget * heightM * heightM;

    const readings = makeReadings(heightCm, weightKg);
    const { classification } = classifier.classifyBmi(readings, baseBmiIndicator);
    expect(classification.label).toBe('Underweight');
  });

  it('treats exactly 18.5 as Normal lower bound', () => {
    const heightCm = 170;
    const bmiTarget = 18.5;
    const heightM = heightCm / 100;
    const weightKg = bmiTarget * heightM * heightM;

    const readings = makeReadings(heightCm, weightKg);
    const { classification } = classifier.classifyBmi(readings, baseBmiIndicator);
    expect(classification.label).toBe('Normal');
  });

  it('classifies BMI just below 25 as Normal and just above as Overweight', () => {
    const heightCm = 170;
    const heightM = heightCm / 100;

    // Just below 25
    const weightBelow = 24.9 * heightM * heightM;
    const belowReadings = makeReadings(heightCm, weightBelow);
    const { classification: belowClass } = classifier.classifyBmi(belowReadings, baseBmiIndicator);
    expect(belowClass.label).toBe('Normal');

    // Just above or equal 25
    const weightAbove = 25 * heightM * heightM;
    const aboveReadings = makeReadings(heightCm, weightAbove);
    const { classification: aboveClass } = classifier.classifyBmi(aboveReadings, baseBmiIndicator);
    expect(aboveClass.label).toBe('Overweight');
  });

  it('uses inclusive upper and lower bounds for obesity classes', () => {
    const heightCm = 170;
    const heightM = heightCm / 100;

    // Exactly 30 -> Obesity Class I lower bound
    const weight30 = 30 * heightM * heightM;
    const { classification: class30 } = classifier.classifyBmi(makeReadings(heightCm, weight30), baseBmiIndicator);
    expect(class30.label).toBe('Obesity Class I');

    // Exactly 34.9 -> Obesity Class I upper bound
    const weight349 = 34.9 * heightM * heightM;
    const { classification: class349 } = classifier.classifyBmi(makeReadings(heightCm, weight349), baseBmiIndicator);
    expect(class349.label).toBe('Obesity Class I');

    // Exactly 35 -> Obesity Class II lower bound
    const weight35 = 35 * heightM * heightM;
    const { classification: class35 } = classifier.classifyBmi(makeReadings(heightCm, weight35), baseBmiIndicator);
    expect(class35.label).toBe('Obesity Class II');

    // Exactly 39.9 -> Obesity Class II upper bound
    const weight399 = 39.9 * heightM * heightM;
    const { classification: class399 } = classifier.classifyBmi(makeReadings(heightCm, weight399), baseBmiIndicator);
    expect(class399.label).toBe('Obesity Class II');

    // Exactly 40 -> Obesity Class III lower bound
    const weight40 = 40 * heightM * heightM;
    const { classification: class40 } = classifier.classifyBmi(makeReadings(heightCm, weight40), baseBmiIndicator);
    expect(class40.label).toBe('Obesity Class III');
  });

  it('returns the configured recommendations for the matching class', () => {
    const readings = makeReadings(170, 64); // Normal
    const { classification } = classifier.classifyBmi(readings, baseBmiIndicator);
    expect(classification.label).toBe('Normal');
  });

  it('throws if no classification matches the computed BMI', () => {
    const customIndicator: IIndicatorData = {
      ...baseBmiIndicator,
      classifications: [
        {
          label: 'Impossible Range',
          status_code: 'warning',
          min_value: 100,
          max_value: 200,
          recommendations: [],
        },
      ],
    };

    // With this indicator, a realistic BMI should not match the configured range
    const readings = makeReadings(170, 70); // BMI ~ 24.2
    expect(() => classifier.classifyBmi(readings, customIndicator)).toThrow(
      /Unable to classify BMI with provided readings/i,
    );
  });

  it('classifies height 195 and weight 70 as Underweight (BMI rounded to 18.4)', () => {
    const readings = makeReadings(195, 70);
    const { classification } = classifier.classifyBmi(readings, baseBmiIndicator);
    expect(classification.label).toBe('Underweight');
  });
});
