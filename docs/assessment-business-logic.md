# Assessment Recording: Business Logic

This document explains how the system records a health assessment, the checks it performs, how results are classified, and when referrals are created. It is written to be clear for both technical and non‑technical readers.

## Overview

- An assessment captures one health indicator (e.g., blood pressure, BMI, diabetes) and the related numeric readings.
- The system validates the request, classifies the result into a health status, stores the assessment, and may create a referral if results are abnormal.
- The system records the evaluator from the authenticated user context; clients do not submit an `evaluatedBy` field in the request body.

## Required Inputs

- Patient number: a positive integer identifying the patient.
- Indicator ID: the identifier of the health indicator being assessed.
- Readings: a set of measurements where each reading has a name (e.g., "height") and a value with its unit (e.g., 170 cm).

## Validation Checks

1. Authenticated evaluator
  - Assessment creation requires an authenticated user because the system stores who performed the assessment.
2. Shape & types (runtime validation)
  - Patient number is expected to be a positive integer identifying an existing patient record.
   - Indicator ID must be a non‑empty string.
   - Each reading must provide:
     - `value`: a positive number (system expects integer in API validation; internal calculators also accept typical numeric values).
     - `unit`: a non‑empty string.
3. Indicator must exist
  - The submitted indicator ID must resolve to an existing indicator definition. Otherwise, the request is rejected.
4. Patient must exist
  - The submitted `patientNumber` must resolve to an existing clinical profile. The assessment links to the patient through that clinical profile's `userId`.
5. Reading units must match the indicator definition
   - For each provided reading, if the indicator defines an expected unit (e.g., `cm`, `kg`, `mmHg`, `mg/dL`), the submitted unit must match. Otherwise, the request is rejected with a clear error message listing mismatches.
  - Only reading keys defined on the indicator are unit-checked. Extra reading keys are not rejected at this validation step.
6. One assessment per indicator per day (by design/index)
   - The assessment storage enforces uniqueness per `(patient, indicator, evaluatedDate)` to avoid duplicates on the same day.
7. Pending referral guard (avoid duplicate work)
   - If the patient already has a pending referral that includes an assessment for the same indicator, creating another assessment for that indicator is blocked until the referral is completed.

## Classification Logic (by Indicator)

The system uses configured thresholds (stored on the indicator) to classify a result into one of several labels with a `status_code` (`healthy`, `warning`, `danger`, `critical`). Recommendations linked to the matching class are returned.

- Classification uses the first matching rule in the indicator's configured order. This means overlapping ranges must be ordered intentionally, typically from most severe to least severe.
- If a matching class has no recommendations configured, the system returns an empty recommendation list.

### Hypertension (blood pressure)

- Inputs: `systolic_blood_pressure` (mmHg), `diastolic_blood_pressure` (mmHg).
- Both readings are required and must be numeric.
- Matching rules use either OR or AND logic per class:
  - Normal: AND — systolic ≤ 119 AND diastolic ≤ 79 → `healthy`.
  - Elevated: OR — systolic ≥ 120 OR diastolic ≥ 80 → `warning`.
  - Stage 1: OR — systolic ≥ 140 OR diastolic ≥ 90 → `danger`.
  - Stage 2: OR — systolic ≥ 160 OR diastolic ≥ 100 → `danger`.
  - Hypertensive Crisis: OR — systolic ≥ 180 OR diastolic ≥ 120 → `critical`.
- If a hypertension class does not specify `logic`, the current implementation treats it as `OR`.
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

1. Authenticate the request and capture the evaluator from the logged‑in user context.
2. Start a database transaction.
3. Validate the request body, ensure the indicator exists, and resolve the patient through `ClinicalProfile.patientNumber`.
4. Check for a pending referral that already contains this indicator for the patient.
5. Validate submitted reading units against the indicator definition.
6. Classify readings using the indicator’s configured thresholds.
7. Store the assessment, including readings, classification, recommendations, evaluator, and server-generated timestamps:
  - `evaluatedAt`: the exact server time when the assessment is created.
  - `evaluatedDate`: the same day normalized to midnight and used for daily uniqueness checks.
8. If classification is not `healthy`:
   - Create or update the patient’s daily referral:
     - One referral per patient per day (`referralDate` is the day at midnight).
     - If a PENDING referral exists for that same day, append the assessment ID.
     - If a PENDING referral exists but for a different date, the system blocks with a “HasPendingReferral” error (assessments and referrals must align to the same day).
     - New referrals set a follow‑up `scheduledVisitDate` to 30 days after `referralDate`.
9. Commit the transaction. If any step fails, the transaction is rolled back so partial assessment/referral data is not left behind.

## Errors & Edge Cases

- Missing required readings (e.g., BMI without height/weight) → error.
- Non‑positive numeric values (e.g., glucose = 0, height = 0) → error.
- Unit mismatch (e.g., height provided in inches while indicator expects cm) → error with details.
- Unknown indicator ID → 404 not found.
- Unknown patient number / missing clinical profile → 404 not found.
- No classification match (values out of all configured ranges) → error.
- Duplicate assessment for same patient/indicator/day → prevented by storage index.
- Duplicate indicator within a pending referral → blocked until referral completes.
- Extra reading names not defined on the indicator are currently stored with the assessment but are ignored by the built-in classifiers.
- If assessment creation or referral creation fails after the transaction starts, all changes are rolled back.

## What Users See

- On success: the response includes the assessment ID, the readings, the chosen classification label and status, and practical recommendations.
- On abnormal results: a referral is created or updated for the same day, and the patient is scheduled for follow‑up in 30 days.

## Notes for Implementers

- Indicator configuration defines the expected readings and units, plus class thresholds and recommendations.
- Hypertension classes may use `logic: 'OR'` or `logic: 'AND'` per class — ensure your indicator data reflects the intended clinical logic.
- BMI is rounded to one decimal before threshold comparison to align with typical clinical categorization.
- Current assessment creation logic explicitly classifies only `hypertension`, `bmi`, and `diabetes`. Adding a new indicator type requires adding classifier logic in code, not just indicator configuration.
- Classification uses the first matching configured rule (`Array.find` behavior), so rule order is part of the business logic.
- Assessment timestamps come from server time; clients do not submit their own evaluation date/time in this flow.
