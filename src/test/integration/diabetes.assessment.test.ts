import { beforeEach, describe, expect, test } from "vitest";
import { Assessment } from "../../models/assessment.model.js";
import Referral from "../../models/referral.model.js";
import { setupTestData } from "../testDataSetup/index.js";
import { setupTestDB } from "../utils/mongo-memory.js";
import {
  arrangeAssessment,
  createAssessment
} from "./util/utils.js";

// Initialize in-memory MongoDB for these tests
setupTestDB();

// Setup test data before running the tests
beforeEach(async () => {
  await setupTestData();
});

describe("Diabetes Assessment: POST /api/v1/assessments", () => {
  // 1) Normal Case: Valid input data should return a diabetes risk assessment with correct risk level and recommendations.
  // 1.1: No referral created
  // 1.2: Assessment is recorded
  // 1.3: Cannot take another diabetes assessment for the same patient and indicator on the same day (enforced by unique index)
  test("1) Normal Case: Valid input returns Normal assessment, no referral, and assessment is recorded", async () => {
    // Arrange
    const { shwToken, patientNumber, indicatorId } = await arrangeAssessment(
      "SOCIAL_HEALTH_WORKER_NYIRANUMA",
      "diabetes",
    );

    // Act
    const res = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          random_blood_glucose: { value: 100, unit: "mg/dL" },
        },
      },
      shwToken,
    );

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.assessment.classification.label).toBe("Normal");
    expect(res.body.data.assessment.classification.status_code).toBe("healthy");
    expect(res.body.data.assessment.recommendations).toEqual(
      expect.arrayContaining([
        "Komeza kurya indyo yuzuye",
        "Komeza gukora imyitozo ngororamubiri buri gihe",
      ]),
    );

    // ======== SIDE EFFECT ASSERTIONS ========
    // 1.1: No referral created (healthy status_code → no referral)
    const referralCount = await Referral.countDocuments();
    expect(referralCount).toBe(0);

    // 1.2: Assessment is recorded
    const assessmentCount = await Assessment.countDocuments();
    expect(assessmentCount).toBe(1);

    // 1.3: A new cannot be created for the same patient and indicator on the same day (enforced by unique index)
    const secondRes = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          random_blood_glucose: { value: 100, unit: "mg/dL" },
        },
      },
      shwToken,
    );
    console.log("Second assessment response:", secondRes.body);
    expect(secondRes.status).toBe(400);
    expect(secondRes.body.status).toBe("fail");
    expect(secondRes.body.message).toBe(
      "Duplicate value for field: patient",
    );
  });

  // 2) Pre-diabetes Case: Input data indicating pre-diabetes should return a risk assessment with appropriate risk level and recommendations.
  // 2.1: Referral created for pre-diabetes case
  // 2.2: Assessment is recorded
  // 2.3: Referral is linked to the assessment
  // 2.4: Cannot take another diabetes assessment while referral is pending
  test("2) Pre-diabetes Case: Pre-diabetes input creates referral, records assessment, links them, and blocks repeat assessment", async () => {
    // Arrange
    const { shwToken, patientNumber, indicatorId } = await arrangeAssessment(
      "SOCIAL_HEALTH_WORKER_NYIRANUMA",
      "diabetes",
    );

    // Act
    const res = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          random_blood_glucose: { value: 160, unit: "mg/dL" },
        },
      },
      shwToken,
    );

    // Assert response
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.assessment.classification.label).toBe("Pre-diabetes: At Risk");
    expect(res.body.data.assessment.classification.status_code).toBe("warning");
    expect(res.body.data.assessment.recommendations).toEqual(
      expect.arrayContaining([
        "Gabanya ibiryo n'ibinyobwa birimo isukari",
        "Gana ikigo cy'ubuzima kikwegereye kugira ngo bongere bagusuzume nyuma y'ibyumweru bine",
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

    // 2.4: Cannot take another diabetes assessment while referral is pending
    const secondRes = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          random_blood_glucose: { value: 160, unit: "mg/dL" },
        },
      },
      shwToken,
    );
    expect(secondRes.status).toBe(400);
    expect(secondRes.body.status).toBe("fail");
    expect(secondRes.body.message).toBe(
      "Patient has a pending referral with this indicator assessment already included. Please resolve the current referral before initiating a new one.",
    );
  });

  // 3) Possible Diabetes Case: Input data indicating high risk for diabetes should return a high-risk assessment and recommendations.
  // 3.1: Referral created for possible diabetes case
  // 3.2: Assessment is recorded
  // 3.3: Referral is linked to the assessment
  // 3.4: Cannot take another diabetes assessment while referral is pending
  test("3) Possible Diabetes Case: High-risk input creates referral, records assessment, links them, and blocks repeat assessment", async () => {
    // Arrange
    const { shwToken, patientNumber, indicatorId } = await arrangeAssessment(
      "SOCIAL_HEALTH_WORKER_NYIRANUMA",
      "diabetes",
    );

    // Act
    const res = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          random_blood_glucose: { value: 220, unit: "mg/dL" },
        },
      },
      shwToken,
    );

    // Assert response
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.assessment.classification.label).toBe("Possible Diabetes");
    expect(res.body.data.assessment.classification.status_code).toBe("critical");
    expect(res.body.data.assessment.recommendations).toEqual(
      expect.arrayContaining([
        "Irinde ibinyobwa birimo isukari nyinshi",
        "Gana ikigo cy'ubuzima kikwegereye kugira ngo bongere bagusuzume nyuma y'ibyumweru bine",
      ]),
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

    // 3.4: Cannot take another diabetes assessment while referral is pending
    const secondRes = await createAssessment(
      {
        patientNumber,
        indicator: indicatorId,
        readings: {
          random_blood_glucose: { value: 220, unit: "mg/dL" },
        },
      },
      shwToken,
    );
    expect(secondRes.status).toBe(400);
    expect(secondRes.body.status).toBe("fail");
    expect(secondRes.body.message).toBe(
      "Patient has a pending referral with this indicator assessment already included. Please resolve the current referral before initiating a new one.",
    );
  });
});
