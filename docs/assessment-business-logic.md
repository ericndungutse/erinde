# Assessment Recording: Business Logic

This document explains how the system records a health assessment, the checks it performs, how results are classified, and when referrals are created. It is written to be clear for both technical and non‑technical readers.

## Overview

- An assessment captures one health indicator (e.g., blood pressure, BMI, diabetes) and the related numeric readings.
- The system validates the request, classifies the result into a health status, stores the assessment, and may create a referral if results are abnormal.

## Required Inputs

- Patient number: a positive integer identifying the patient.
- Indicator ID: the identifier of the health indicator being assessed.
- Readings: a set of measurements where each reading has a name (e.g., "height") and a value with its unit (e.g., 170 cm).

## Validation Checks

1. Shape & types (runtime validation)
   - Patient number must be a positive integer.
   - Indicator ID must be a non‑empty string.
   - Each reading must provide:
     - `value`: a positive number (system expects integer in API validation; internal calculators also accept typical numeric values).
     - `unit`: a non‑empty string.
2. Reading units must match the indicator definition
   - For each provided reading, if the indicator defines an expected unit (e.g., `cm`, `kg`, `mmHg`, `mg/dL`), the submitted unit must match. Otherwise, the request is rejected with a clear error message listing mismatches.
3. One assessment per indicator per day (by design/index)
   - The assessment storage enforces uniqueness per `(patient, indicator, evaluatedDate)` to avoid duplicates on the same day.
4. Pending referral guard (avoid duplicate work)
   - If the patient already has a pending referral that includes an assessment for the same indicator, creating another assessment for that indicator is blocked until the referral is completed.

## Classification Logic (by Indicator)

The system uses configured thresholds (stored on the indicator) to classify a result into one of several labels with a `status_code` (`healthy`, `warning`, `danger`, `critical`). Recommendations linked to the matching class are returned.

### Hypertension (blood pressure)

- Inputs: `systolic_blood_pressure` (mmHg), `diastolic_blood_pressure` (mmHg).
- Both readings are required and must be numeric.
- Matching rules use either OR or AND logic per class:
  - Normal: AND — systolic ≤ 119 AND diastolic ≤ 79 → `healthy`.
  - Elevated: OR — systolic ≥ 120 OR diastolic ≥ 80 → `warning`.
  - Stage 1: OR — systolic ≥ 140 OR diastolic ≥ 90 → `danger`.
  - Stage 2: OR — systolic ≥ 160 OR diastolic ≥ 100 → `danger`.
  - Hypertensive Crisis: OR — systolic ≥ 180 OR diastolic ≥ 120 → `critical`.
- If no class matches, the assessment is rejected.

### BMI (body mass index)

- Inputs: `height` (cm) and `weight` (kg). Both are required and must be positive.
- BMI formula: $\text{BMI} = \dfrac{\text{weight (kg)}}{\text{height (m)}^2}$, rounded to 1 decimal place before comparing to thresholds.
- Thresholds (inclusive bounds):
  - Underweight: BMI ≤ 18.4 → `warning`.
  - Normal: 18.5 ≤ BMI ≤ 24.9 → `healthy`.
  - Overweight: 25.0 ≤ BMI ≤ 29.9 → `warning`.
  - Obesity Class I: 30.0 ≤ BMI ≤ 34.9 → `danger`.
  - Obesity Class II: 35.0 ≤ BMI ≤ 39.9 → `danger`.
  - Obesity Class III: BMI ≥ 40.0 → `danger`/`critical` (per configuration).
- If no class matches, the assessment is rejected.

### Diabetes (random blood glucose)

- Input: `random_blood_glucose` (mg/dL). Required and must be positive.
- Thresholds (inclusive bounds):
  - Normal: glucose ≤ 139.9 → `healthy`.
  - Pre‑diabetes: 140.0 ≤ glucose ≤ 199.9 → `warning`.
  - Possible Diabetes: glucose ≥ 200 → `critical`.
- If no class matches, the assessment is rejected.

## Recording & Referral Flow

1. Validate the request (shape, types, and units) and ensure the indicator exists.
2. Resolve the patient by `patientNumber`.
3. Classify readings using the indicator’s configured thresholds.
4. Store the assessment, including readings, classification, recommendations, evaluator, and timestamps.
5. If classification is not `healthy`:
   - `evaluatedBy` must be provided (who made the assessment).
   - Create or update the patient’s daily referral:
     - One referral per patient per day (`referralDate` is the day at midnight).
     - If a PENDING referral exists for that same day, append the assessment ID.
     - If a PENDING referral exists but for a different date, the system blocks with a “HasPendingReferral” error (assessments and referrals must align to the same day).
     - New referrals set a follow‑up `scheduledVisitDate` to 30 days after `referralDate`.

## Errors & Edge Cases

- Missing required readings (e.g., BMI without height/weight) → error.
- Non‑positive numeric values (e.g., glucose = 0, height = 0) → error.
- Unit mismatch (e.g., height provided in inches while indicator expects cm) → error with details.
- No classification match (values out of all configured ranges) → error.
- Duplicate assessment for same patient/indicator/day → prevented by storage index.
- Duplicate indicator within a pending referral → blocked until referral completes.
- Abnormal result without `evaluatedBy` → referral not created; request rejected.

## What Users See

- On success: the response includes the assessment ID, the readings, the chosen classification label and status, and practical recommendations.
- On abnormal results: a referral is created or updated for the same day, and the patient is scheduled for follow‑up in 30 days.

## Notes for Implementers

- Indicator configuration defines the expected readings and units, plus class thresholds and recommendations.
- Hypertension classes may use `logic: 'OR'` or `logic: 'AND'` per class — ensure your indicator data reflects the intended clinical logic.
- BMI is rounded to one decimal before threshold comparison to align with typical clinical categorization.
