import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import AssessmentClassifier from '../service/assessment-classifier.service.js';
import type { IIndicatorData } from '../types/indicator.types.js';
import type { IAssessmentReadings } from '../domain/assessment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type HypertensionSuccessCase = {
  name: string;
  systolic: number | null;
  diastolic: number | null;
  expectedLabel: string;
  expectedStatus?: string;
};

type HypertensionTestData = {
  successCases: HypertensionSuccessCase[];
};

const rawData = readFileSync(resolve(__dirname, 'hypertension-cases.json'), 'utf-8');
const testData: HypertensionTestData = JSON.parse(rawData);

const baseHypertensionIndicator: IIndicatorData = {
  name: 'hypertension',
  readings: [
    { type: 'systolic_blood_pressure', unit: 'mmHg' },
    { type: 'diastolic_blood_pressure', unit: 'mmHg' },
  ],
  classifications: [
    {
      label: 'Hypertensive Crisis',
      status_code: 'critical',
      min_systolic: 180,
      min_diastolic: 120,
      logic: 'OR',
      recommendations: ['Gana ivuriro ryihuse'],
    },
    {
      label: 'Likely Hypertension Stage 2',
      status_code: 'danger',
      min_systolic: 160,
      min_diastolic: 100,
      logic: 'OR',
      recommendations: ['Rya neza'],
    },
    {
      label: 'Likely Hypertension Stage 1',
      status_code: 'danger',
      min_systolic: 140,
      min_diastolic: 90,
      logic: 'OR',
      recommendations: ['Wongere imyitozo'],
    },
    {
      label: 'Elevated',
      status_code: 'warning',
      min_systolic: 120,
      min_diastolic: 80,
      logic: 'OR',
      recommendations: ['Gabanya umunyu'],
    },
    {
      label: 'Normal',
      status_code: 'healthy',
      max_systolic: 119,
      max_diastolic: 79,
      logic: 'AND',
      recommendations: ['Komeza ubuzima bwiza'],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReadings(systolic?: number | null, diastolic?: number | null): IAssessmentReadings {
  const readings: IAssessmentReadings = {};
  if (systolic != null) readings['systolic_blood_pressure'] = { value: systolic, unit: 'mmHg' };
  if (diastolic != null) readings['diastolic_blood_pressure'] = { value: diastolic, unit: 'mmHg' };
  return readings;
}

describe('AssessmentClassifier.classifyHypertension', () => {
  const classifier = new AssessmentClassifier();

  describe('Data-driven classification cases (from JSON)', () => {
    for (const c of testData.successCases) {
      it(c.name, () => {
        const readings = makeReadings(c.systolic, c.diastolic);
        const { classification } = classifier.classifyHypertension(readings, baseHypertensionIndicator);

        expect(classification.label).toBe(c.expectedLabel);
        if (c.expectedStatus) {
          expect(classification.status_code).toBe(c.expectedStatus as any);
        }
      });
    }
  });

  describe('Error Handling', () => {
    it('throws if systolic or diastolic reading is missing', () => {
      expect(() => classifier.classifyHypertension(makeReadings(120, undefined), baseHypertensionIndicator)).toThrow(
        /requires systolic and diastolic readings/i,
      );
      expect(() => classifier.classifyHypertension(makeReadings(undefined, 80), baseHypertensionIndicator)).toThrow(
        /requires systolic and diastolic readings/i,
      );
    });

    it('throws if no classification matches (Narrow Range test)', () => {
      const customIndicator: IIndicatorData = {
        ...baseHypertensionIndicator,
        classifications: [
          {
            label: 'Impossible',
            status_code: 'warning',
            min_systolic: 300,
            min_diastolic: 300,
            logic: 'AND',
            recommendations: [],
          },
        ],
      };
      expect(() => classifier.classifyHypertension(makeReadings(120, 80), customIndicator)).toThrow(
        /Unable to classify hypertension/i,
      );
    });
  });
});
