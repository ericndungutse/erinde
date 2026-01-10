import type { IIndicatorData } from '../types/indicator.types.js';
import type { IAssessmentReadings, IAssessmentClassification } from '../types/assessment.types.js';

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
    indicator: IIndicatorData
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
}
