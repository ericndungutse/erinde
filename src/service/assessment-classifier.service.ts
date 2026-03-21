import type { IIndicatorData } from '../types/indicator.types.js';
import InvalidBmiReadingsFormat from '../Errors/InvalidBmiReadingsFormat.js';
import type { IAssessmentClassification, IAssessmentReadings } from '../domain/assessment.js';

/**
 * Encapsulates classification logic for assessments.
 *
 * For now, only hypertension classification is implemented.
 */
export default class AssessmentClassifier {
  /**
   * Classify hypertension based on systolic and diastolic readings
   * using the indicator's configured classifications.
   */
  classifyHypertension(
    readings: IAssessmentReadings,
    indicator: IIndicatorData,
  ): { classification: IAssessmentClassification; recommendations: string[] } {
    const systolic = readings['systolic_blood_pressure']?.value;
    const diastolic = readings['diastolic_blood_pressure']?.value;

    if (typeof systolic !== 'number' || typeof diastolic !== 'number') {
      throw new Error('Hypertension classification requires systolic and diastolic readings');
    }

    const match = indicator.classifications.find((c) => {
      const sysMatches =
        (c.min_systolic === undefined || systolic >= c.min_systolic) &&
        (c.max_systolic === undefined || systolic <= c.max_systolic);

      const diaMatches =
        (c.min_diastolic === undefined || diastolic >= c.min_diastolic) &&
        (c.max_diastolic === undefined || diastolic <= c.max_diastolic);

      // Default to OR if logic is not specified
      if (!c.logic || c.logic === 'OR') {
        return sysMatches || diaMatches;
      }

      // AND logic: both systolic and diastolic constraints must match
      return sysMatches && diaMatches;
    });

    if (!match) {
      throw new Error('Unable to classify hypertension with provided readings');
    }

    const classification: IAssessmentClassification = {
      label: match.label,
      status_code: match.status_code,
    };

    return {
      classification,
      recommendations: match.recommendations ?? [],
    };
  }

  /**
   * Classify BMI based on height (cm) and weight (kg).
   *
   * BMI is calculated as: weight(kg) / (height(m) ^ 2)
   * and then mapped to the indicator's min_value / max_value ranges.
   */
  classifyBmi(
    readings: IAssessmentReadings,
    indicator: IIndicatorData,
  ): { classification: IAssessmentClassification; recommendations: string[] } {
    const heightCm = readings['height']?.value;
    const weightKg = readings['weight']?.value;

    if (typeof heightCm !== 'number' || typeof weightKg !== 'number') {
      throw new InvalidBmiReadingsFormat();
    }

    if (heightCm <= 0 || weightKg <= 0) {
      throw new InvalidBmiReadingsFormat('BMI classification requires positive height and weight values');
    }

    const heightM = heightCm / 100;
    const rawBmi = weightKg / (heightM * heightM);

    // Round BMI to 1 decimal place to align with configured thresholds
    const bmi = Math.round(rawBmi * 10) / 10;

    const match = indicator.classifications.find((c) => {
      const minMatches = c.min_value === undefined || bmi >= c.min_value;
      const maxMatches = c.max_value === undefined || bmi <= c.max_value;
      return minMatches && maxMatches;
    });

    if (!match) {
      throw new Error('Unable to classify BMI with provided readings');
    }

    const classification: IAssessmentClassification = {
      label: match.label,
      status_code: match.status_code,
    };

    return {
      classification,
      recommendations: match.recommendations ?? [],
    };
  }

  /**
   * Classify diabetes based on random blood glucose reading.
   *
   * Uses indicator min_value / max_value thresholds directly on the
   * provided reading value.
   */
  classifyDiabetes(
    readings: IAssessmentReadings,
    indicator: IIndicatorData,
  ): { classification: IAssessmentClassification; recommendations: string[] } {
    const glucose = readings['random_blood_glucose']?.value;

    if (typeof glucose !== 'number') {
      throw new Error('Diabetes classification requires random_blood_glucose reading');
    }

    if (glucose <= 0) {
      throw new Error('Diabetes classification requires a positive glucose value');
    }

    const match = indicator.classifications.find((c) => {
      const minMatches = c.min_value === undefined || glucose >= c.min_value;
      const maxMatches = c.max_value === undefined || glucose <= c.max_value;
      return minMatches && maxMatches;
    });

    if (!match) {
      throw new Error('Unable to classify diabetes with provided readings');
    }

    const classification: IAssessmentClassification = {
      label: match.label,
      status_code: match.status_code,
    };

    return {
      classification,
      recommendations: match.recommendations ?? [],
    };
  }
}
