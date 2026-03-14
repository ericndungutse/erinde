import { beforeEach, describe, expect, test } from 'vitest';
import { Assessment } from '../../models/assessment.model.js';
import Referral from '../../models/referral.model.js';
import { setupTestData } from '../testDataSetup/index.js';
import { setupTestDB } from '../utils/mongo-memory.js';
import { arrangeAssessment, createAssessment } from './util/utils.js';

// Initialize in-memory MongoDB for these tests
setupTestDB();

// Setup test data before running the tests
beforeEach(async () => {
  await setupTestData();
});

describe('Hypertension Assessment: POST /api/v1/assessments', () => {
  // 1) Normal Case: Valid hypertension readings should return a Normal assessment with healthy status and recommendations.
  // 1.1: No referral should be created for a healthy hypertension assessment.
  // 1.2: The assessment should be recorded in the database.
  // 1.3: A second hypertension assessment for the same patient and indicator on the same day should be rejected by the unique index.
  test('1) Normal Case: Valid input returns Normal assessment, no referral, and assessment is recorded', async () => {
    // Arrange
    const { shwToken, patientNumber, indicatorId } = await arrangeAssessment(
      'SOCIAL_HEALTH_WORKER_NYIRANUMA',
      'hypertension',
    );

    // Act
    const res = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          systolic_blood_pressure: { value: 118, unit: 'mmHg' },
          diastolic_blood_pressure: { value: 78, unit: 'mmHg' },
        },
      },
      shwToken,
    );

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.assessment.classification.label).toBe('Normal');
    expect(res.body.data.assessment.classification.status_code).toBe('healthy');
    expect(res.body.data.assessment.recommendations).toEqual(
      expect.arrayContaining(['Komeza ubuzima bwiza urimo', "Komeza kwisuzumisha uko ubishishikarijwe n'abaganga"]),
    );

    // ======== SIDE EFFECT ASSERTIONS ========
    // 1.1: No referral created (healthy status_code -> no referral)
    const referralCount = await Referral.countDocuments();
    expect(referralCount).toBe(0);

    // 1.2: Assessment is recorded
    const assessmentCount = await Assessment.countDocuments();
    expect(assessmentCount).toBe(1);

    // 1.3: A new one cannot be created for the same patient and indicator on the same day (enforced by unique index)
    const secondRes = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          systolic_blood_pressure: { value: 118, unit: 'mmHg' },
          diastolic_blood_pressure: { value: 78, unit: 'mmHg' },
        },
      },
      shwToken,
    );

    expect(secondRes.status).toBe(400);
    expect(secondRes.body.status).toBe('fail');
    expect(secondRes.body.message).toBe('Duplicate value for field: patient');
  });

  // 2) Elevated Case: Elevated hypertension readings should return an Elevated assessment with warning status and recommendations.
  // 2.1: A referral should be created for an elevated hypertension assessment.
  // 2.2: The assessment should be recorded in the database.
  // 2.3: The created referral should be linked to the assessment.
  // 2.4: A second hypertension assessment should be blocked while the referral is still pending.
  test('2) Elevated Case: Elevated input creates referral, records assessment, links them, and blocks repeat assessment', async () => {
    // Arrange
    const { shwToken, patientNumber, indicatorId } = await arrangeAssessment(
      'SOCIAL_HEALTH_WORKER_NYIRANUMA',
      'hypertension',
    );

    // Act
    const res = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          systolic_blood_pressure: { value: 130, unit: 'mmHg' },
          diastolic_blood_pressure: { value: 78, unit: 'mmHg' },
        },
      },
      shwToken,
    );

    // Assert response
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.assessment.classification.label).toBe('Elevated');
    expect(res.body.data.assessment.classification.status_code).toBe('warning');
    expect(res.body.data.assessment.recommendations).toEqual(
      expect.arrayContaining([
        "Gabanya umunyu kandi urye imbuto n'imboga nyinshi",
        'Kora imyitozo ngororamubiri kandi wirinde imihangayiko',
      ]),
    );

    // ======== SIDE EFFECT ASSERTIONS ========
    const assessmentId = res.body.data.assessment.id;

    // 2.1: Referral created
    const referralCount = await Referral.countDocuments();
    expect(referralCount).toBe(1);

    // 2.2: Assessment is recorded
    const assessmentCount = await Assessment.countDocuments();
    expect(assessmentCount).toBe(1);

    // 2.3: Referral is linked to the assessment
    const referral = await Referral.findOne({ patientNumber }).lean();
    expect(referral).not.toBeNull();
    expect(referral!.assessments.map(String)).toContain(assessmentId);

    // 2.4: Cannot take another hypertension assessment while referral is pending
    const secondRes = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          systolic_blood_pressure: { value: 130, unit: 'mmHg' },
          diastolic_blood_pressure: { value: 78, unit: 'mmHg' },
        },
      },
      shwToken,
    );

    expect(secondRes.status).toBe(400);
    expect(secondRes.body.status).toBe('fail');
    expect(secondRes.body.message).toBe(
      'Patient has a pending referral with this indicator assessment already included. Please resolve the current referral before initiating a new one.',
    );
  });

  // 3) Likely Hypertension Stage 1 Case: Stage 1 readings should return the correct danger classification and recommendations.
  // 3.1: A referral should be created for a Stage 1 hypertension assessment.
  // 3.2: The assessment should be recorded in the database.
  // 3.3: The created referral should be linked to the assessment.
  // 3.4: A second hypertension assessment should be blocked while the referral is still pending.
  test('3) Likely Hypertension Stage 1 Case: Stage 1 input creates referral, records assessment, links them, and blocks repeat assessment', async () => {
    // Arrange
    const { shwToken, patientNumber, indicatorId } = await arrangeAssessment(
      'SOCIAL_HEALTH_WORKER_NYIRANUMA',
      'hypertension',
    );

    // Act
    const res = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          systolic_blood_pressure: { value: 145, unit: 'mmHg' },
          diastolic_blood_pressure: { value: 85, unit: 'mmHg' },
        },
      },
      shwToken,
    );

    // Assert response
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.assessment.classification.label).toBe('Likely Hypertension Stage 1');
    expect(res.body.data.assessment.classification.status_code).toBe('danger');
    expect(res.body.data.assessment.recommendations).toEqual(
      expect.arrayContaining(['Wongere imyitozo ngororamubiri', "Gabanya ibiryo birimo umunyu mwinshi n'ibinure"]),
    );

    // ======== SIDE EFFECT ASSERTIONS ========
    const assessmentId = res.body.data.assessment.id;

    // 3.1: Referral created
    const referralCount = await Referral.countDocuments();
    expect(referralCount).toBe(1);

    // 3.2: Assessment is recorded
    const assessmentCount = await Assessment.countDocuments();
    expect(assessmentCount).toBe(1);

    // 3.3: Referral is linked to the assessment
    const referral = await Referral.findOne({ patientNumber }).lean();
    expect(referral).not.toBeNull();
    expect(referral!.assessments.map(String)).toContain(assessmentId);

    // 3.4: Cannot take another hypertension assessment while referral is pending
    const secondRes = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          systolic_blood_pressure: { value: 145, unit: 'mmHg' },
          diastolic_blood_pressure: { value: 85, unit: 'mmHg' },
        },
      },
      shwToken,
    );

    expect(secondRes.status).toBe(400);
    expect(secondRes.body.status).toBe('fail');
    expect(secondRes.body.message).toBe(
      'Patient has a pending referral with this indicator assessment already included. Please resolve the current referral before initiating a new one.',
    );
  });

  // 4) Likely Hypertension Stage 2 Case: Stage 2 readings should return the correct danger classification and recommendations.
  // 4.1: A referral should be created for a Stage 2 hypertension assessment.
  // 4.2: The assessment should be recorded in the database.
  // 4.3: The created referral should be linked to the assessment.
  // 4.4: A second hypertension assessment should be blocked while the referral is still pending.
  test('4) Likely Hypertension Stage 2 Case: Stage 2 input creates referral, records assessment, links them, and blocks repeat assessment', async () => {
    // Arrange
    const { shwToken, patientNumber, indicatorId } = await arrangeAssessment(
      'SOCIAL_HEALTH_WORKER_NYIRANUMA',
      'hypertension',
    );

    // Act
    const res = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          systolic_blood_pressure: { value: 165, unit: 'mmHg' },
          diastolic_blood_pressure: { value: 95, unit: 'mmHg' },
        },
      },
      shwToken,
    );

    // Assert response
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.assessment.classification.label).toBe('Likely Hypertension Stage 2');
    expect(res.body.data.assessment.classification.status_code).toBe('danger');
    expect(res.body.data.assessment.recommendations).toEqual(
      expect.arrayContaining([
        'Rya neza kandi ukore imyitozo ngororamubiri buri munsi',
        "Irinde itabi n'inzoga nyinshi",
      ]),
    );

    // ======== SIDE EFFECT ASSERTIONS ========
    const assessmentId = res.body.data.assessment.id;

    // 4.1: Referral created
    const referralCount = await Referral.countDocuments();
    expect(referralCount).toBe(1);

    // 4.2: Assessment is recorded
    const assessmentCount = await Assessment.countDocuments();
    expect(assessmentCount).toBe(1);

    // 4.3: Referral is linked to the assessment
    const referral = await Referral.findOne({ patientNumber }).lean();
    expect(referral).not.toBeNull();
    expect(referral!.assessments.map(String)).toContain(assessmentId);

    // 4.4: Cannot take another hypertension assessment while referral is pending
    const secondRes = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          systolic_blood_pressure: { value: 165, unit: 'mmHg' },
          diastolic_blood_pressure: { value: 95, unit: 'mmHg' },
        },
      },
      shwToken,
    );

    expect(secondRes.status).toBe(400);
    expect(secondRes.body.status).toBe('fail');
    expect(secondRes.body.message).toBe(
      'Patient has a pending referral with this indicator assessment already included. Please resolve the current referral before initiating a new one.',
    );
  });

  // 5) Hypertensive Crisis Case: Crisis-level readings should return the correct critical classification and recommendations.
  // 5.1: A referral should be created for a hypertensive crisis assessment.
  // 5.2: The assessment should be recorded in the database.
  // 5.3: The created referral should be linked to the assessment.
  // 5.4: A second hypertension assessment should be blocked while the referral is still pending.
  test('5) Hypertensive Crisis Case: Crisis input creates referral, records assessment, links them, and blocks repeat assessment', async () => {
    // Arrange
    const { shwToken, patientNumber, indicatorId } = await arrangeAssessment(
      'SOCIAL_HEALTH_WORKER_NYIRANUMA',
      'hypertension',
    );

    // Act
    const res = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          systolic_blood_pressure: { value: 185, unit: 'mmHg' },
          diastolic_blood_pressure: { value: 110, unit: 'mmHg' },
        },
      },
      shwToken,
    );

    // Assert response
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.assessment.classification.label).toBe('Hypertensive Crisis');
    expect(res.body.data.assessment.classification.status_code).toBe('critical');
    expect(res.body.data.assessment.recommendations).toEqual(
      expect.arrayContaining(['Gana ivuriro ryihuse bitarenze uyu munsi', 'Gabanya umunyu kandi urye indyo yuzuye']),
    );

    // ======== SIDE EFFECT ASSERTIONS ========
    const assessmentId = res.body.data.assessment.id;

    // 5.1: Referral created
    const referralCount = await Referral.countDocuments();
    expect(referralCount).toBe(1);

    // 5.2: Assessment is recorded
    const assessmentCount = await Assessment.countDocuments();
    expect(assessmentCount).toBe(1);

    // 5.3: Referral is linked to the assessment
    const referral = await Referral.findOne({ patientNumber }).lean();
    expect(referral).not.toBeNull();
    expect(referral!.assessments.map(String)).toContain(assessmentId);

    // 5.4: Cannot take another hypertension assessment while referral is pending
    const secondRes = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          systolic_blood_pressure: { value: 185, unit: 'mmHg' },
          diastolic_blood_pressure: { value: 110, unit: 'mmHg' },
        },
      },
      shwToken,
    );

    expect(secondRes.status).toBe(400);
    expect(secondRes.body.status).toBe('fail');
    expect(secondRes.body.message).toBe(
      'Patient has a pending referral with this indicator assessment already included. Please resolve the current referral before initiating a new one.',
    );
  });
});
