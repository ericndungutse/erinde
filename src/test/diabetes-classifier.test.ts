import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import AssessmentClassifier from '../service/assessment-classifier.service.js';
import type { IIndicatorData } from '../types/indicator.types.js';
import type { IAssessmentReadings } from '../types/assessment.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type DiabetesSuccessCase = {
  name: string;
  value: number;
  expectedLabel: string;
};

type DiabetesTestData = {
  successCases: DiabetesSuccessCase[];
};

const rawData = readFileSync(resolve(__dirname, 'diabetes-cases.json'), 'utf-8');
const testData: DiabetesTestData = JSON.parse(rawData);

const baseDiabetesIndicator: IIndicatorData = {
  name: 'diabetes',
  readings: [{ type: 'random_blood_glucose', unit: 'mg/dL' }],
  classifications: [
    {
      label: 'Possible Diabetes',
      status_code: 'critical',
      min_value: 200,
      recommendations: [
        'Irinde ibinyobwa birimo isukari nyinshi',
        "Gana ikigo cy'ubuzima kikwegereye kugira ngo bongere bagusuzume nyuma y'ibyumweru bine",
      ],
    },
    {
      label: 'Pre-diabetes: At Risk',
      status_code: 'warning',
      min_value: 140,
      max_value: 199.9,
      recommendations: [
        "Gabanya ibiryo n'ibinyobwa birimo isukari",
        "Gana ikigo cy'ubuzima kikwegereye kugira ngo bongere bagusuzume nyuma y'ibyumweru bine",
      ],
    },
    {
      label: 'Normal',
      status_code: 'healthy',
      max_value: 139.9,
      recommendations: ['Komeza kurya indyo yuzuye', 'Komeza gukora imyitozo ngororamubiri buri gihe'],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReadings(glucose?: number | null): IAssessmentReadings {
  const readings: IAssessmentReadings = {};
  if (glucose != null) readings['random_blood_glucose'] = { value: glucose, unit: 'mg/dL' };
  return readings;
}

describe('AssessmentClassifier.classifyDiabetes', () => {
  const classifier = new AssessmentClassifier();

  describe('Data-driven classification cases (from JSON)', () => {
    for (const c of testData.successCases) {
      it(c.name, () => {
        const readings = makeReadings(c.value);
        const { classification } = classifier.classifyDiabetes(readings, baseDiabetesIndicator);

        expect(classification.label).toBe(c.expectedLabel);
      });
    }
  });

  describe('Error Handling', () => {
    it('throws if random_blood_glucose reading is missing', () => {
      expect(() => classifier.classifyDiabetes(makeReadings(undefined), baseDiabetesIndicator)).toThrow(
        /requires random_blood_glucose reading/i
      );
    });

    it('throws if glucose value is non-positive', () => {
      expect(() => classifier.classifyDiabetes(makeReadings(0), baseDiabetesIndicator)).toThrow(
        /positive glucose value/i
      );
    });

    it('throws if no classification matches (Narrow Range test)', () => {
      const customIndicator: IIndicatorData = {
        ...baseDiabetesIndicator,
        classifications: [
          {
            label: 'Impossible Range',
            status_code: 'warning',
            min_value: 500,
            max_value: 600,
            recommendations: [],
          },
        ],
      };

      expect(() => classifier.classifyDiabetes(makeReadings(150), customIndicator)).toThrow(
        /Unable to classify diabetes with provided readings/i
      );
    });
  });
});
