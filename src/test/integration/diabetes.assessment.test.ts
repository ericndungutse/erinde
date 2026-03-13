import { beforeAll, describe, expect, test } from "vitest";
import { ConstantValues } from "../../constants/constant.values.js";
import { ACCOUNT_SETUP } from "../testDataSetup/account-setup.js";
import { setupTestData } from "../testDataSetup/index.js";
import { loginByPhone } from "../utils/auth-helpers.js";
import { setupTestDB } from "../utils/mongo-memory.js";
import { client } from "../utils/request-factory.js";
import { getTestPatients } from "../utils/readPatients.js";
import { selectPatientByVillage } from "../utils/testDataSelectors.js";
import type { RegisterUserDTO } from "../../dto/user.dto.js";
import {
  arrangeAssessment,
  createAssessment,
  getIndicatorByName,
  getIndicators,
  registerPatient,
} from "./util/utils.js";
import Referral from "../../models/referral.model.js";
import { Assessment } from "../../models/assessment.model.js";
// Requirements

// 1) Test Normal Case: Valid input data should return a diabetes risk assessment with correct risk level and recommendations.
// 1.1: No referral created
//1.2: Assessment is recorded

// 2) Test Pre-diabetes Case: Input data indicating pre-diabetes should return a risk assessment with appropriate risk level and recommendations for lifestyle changes.
// 2.1: Referral created for pre-diabetes case
// 2.2: Assessment is recorded
// 2.3: Referral is linked to the assessment
// 2.4: Cannot take another diabetes assessment while referral is pending

// 3) Test Possible Diabetes Case: Input data indicating high risk for diabetes should return a risk assessment with high-risk level and recommendations for medical consultation and lifestyle changes.
// 3.1: Referral created for possible diabetes case
// 3.2: Assessment is recorded
// 3.3: Referral is linked to the assessment
// 3.4: Cannot take another diabetes assessment while referral is pending

// 4) Same-Day Referral Reuse
// 4.1 First abnormal assessment creates referral
// 4.2 Second abnormal assessment same day
// 4.3 No new referral created
// 4.4 Assessment appended to existing referral

// Initialize in-memory MongoDB for these tests
setupTestDB();

// Setup test data before running the tests
beforeAll(async () => {
  await setupTestData();
});

describe("Diabetes Assessment: POST /api/v1/assessments", () => {
  // 1) Normal Case: Valid input data should return a diabetes risk assessment with correct risk level and recommendations.
  // 1.1: No referral created
  // 1.2: Assessment is recorded
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
  });
});
