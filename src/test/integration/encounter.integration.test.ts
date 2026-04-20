import { beforeEach, describe, expect, it } from "vitest";
import type { CreateEncounterDTO } from "../../dto/encounter.dto.js";
import { logger } from "../../logger.js";
import Encounter from "../../models/encounter.model.js";
import Referral from "../../models/referral.model.js";
import type { ILoginPayload } from "../../types/auth.types.js";
import {
  existingCHUTestData,
  existingIndicatorTestData,
  existingNurseTestData,
  existingPatientsTestData,
  existingSHWTestData,
  invalidEncounterPayloadCases,
  nonExistingPatientsTestData,
  readingsTestData,
} from "../fixtures/runtime-test-data-v2.js";
import { runFixtureSetups } from "../fixtures/setup/index.js";
import { loginByPhone } from "../utils/auth-helpers.js";
import { setupTestDB } from "../utils/mongo-memory.js";
import { client, TEST_LANG } from "../utils/request-factory.js";
import i18next from "./../../i18n.js";

setupTestDB();

// 1. HAPPY PATH
describe("INTEGRATION => POST: /api/v1/encounters", () => {
  beforeEach(async () => {
    logger.info("Setting up fixtures for encounter integration tests.");
    await runFixtureSetups();
    logger.info("Fixtures setup completed for encounter integration tests.");
  });
  it("should create encounter with no existing referral for existing patient => Rutenga one patient => Kabyayi Nurse", async () => {
    logger.info(
      "----------------- Testing creation create encounter with existing user with no referral -----------------",
    );
    // ARANGE
    // Loggin as NURSE

    logger.info("Constructing the login payload for nurse.");
    const payload: ILoginPayload = {
      identifier:
        existingNurseTestData["kabwayi-HC-NURSE"].credentials.phoneNumber,
      password: existingNurseTestData["kabwayi-HC-NURSE"].credentials.password,
    };

    logger.debug(
      {
        loginPayload: payload,
      },
      "Loggin payload for nurse created",
    );

    logger.info("Sending login request for nurse.");
    const token = await loginByPhone(payload.identifier, payload.password);
    logger.debug({ token }, "Nurse logged in successfully, received token:");

    // create encounter payload
    logger.info("Constructing the encounter creation payload.");
    const encounterPayload: CreateEncounterDTO = {
      patientNumber: existingPatientsTestData["rutenga-one"].patientNumber,
      urgency: "low",
    };

    logger.debug(
      { encounterPayload },
      "Encounter creation payload constructed.",
    );

    // ACT
    // Create Encounter with no existing referral for existing patient
    logger.info(
      "Sending request to create encounter for existing patient with no referral.",
    );
    const createEncounterRes = await client()
      .post("/api/v1/encounters")
      .set("Authorization", `Bearer ${token}`)
      .send(encounterPayload);

    logger.debug(
      { status: createEncounterRes.status, body: createEncounterRes.body },
      "Received response for encounter creation request.",
    );

    // ASSERT
    // 2. RESPONSE
    expect(createEncounterRes.status).toBe(201);
    expect(createEncounterRes.body).toEqual(
      expect.objectContaining({
        status: "success",
        message: "Encounter created successfully",
        data: expect.objectContaining({
          encounter: expect.objectContaining({
            id: expect.any(String),
            patientNumber:
              existingPatientsTestData["rutenga-one"].patientNumber,
            referralId: null,
            state: "open",
            currentStep: "triage",
            urgency: "low",
            openedAt: expect.any(String),
          }),
        }),
      }),
    );

    // 2. SIDE EFFECTS
    const savedEncounter = await Encounter.findById(
      createEncounterRes.body.data.encounter.id,
    ).lean();
    expect(savedEncounter).not.toBeNull();
    expect(savedEncounter?.patientNumber).toBe(
      createEncounterRes.body.data.encounter.patientNumber,
    );

    // 3. Logic Check: Ensure no referral was accidentally linked
    expect(savedEncounter?.referralId).toBeNull();
    expect(savedEncounter?.hospitalId.toString()).toBe(
      existingNurseTestData["kabwayi-HC-NURSE"].hospitalId.toString(),
    );
    expect(savedEncounter?.initiator.toString()).toBe(
      existingNurseTestData["kabwayi-HC-NURSE"]._id.toString(),
    );
  });

  it("should create encounter for non-existing patient by registering patient first", async () => {
    logger.info(
      "----------------- Testing encounter creation for non-existing patient -----------------",
    );
    // ARANGE
    // Loggin as NURSE
    logger.info("Constructing the login payload for nurse.");
    const nurse = existingNurseTestData["kabwayi-HC-NURSE"];
    const communityHealthUnit = existingCHUTestData["rutenga-CHU"];
    const nonExistingPatientOne =
      nonExistingPatientsTestData["rutenga-non-existing-one"];

    const payload: ILoginPayload = {
      identifier: nurse.credentials.phoneNumber,
      password: nurse.credentials.password,
    };

    logger.info("Sending login request for nurse.");
    const token = await loginByPhone(payload.identifier, payload.password);

    logger.info(
      "Constructing encounter payload for non-existing patient registration.",
    );
    const encounterPayload: CreateEncounterDTO = {
      registerUserDto: {
        ...nonExistingPatientOne,
        birthdate: new Date(nonExistingPatientOne.birthdate),
        communityHealthUnit: communityHealthUnit.id,
      },
      urgency: "low",
    };

    // ACT
    logger.info(
      "Sending request to create encounter for non-existing patient.",
    );
    const createEncounterRes = await client()
      .post("/api/v1/encounters")
      .set("Authorization", `Bearer ${token}`)
      .send(encounterPayload);

    // ASSERT
    // 1. RESPONSE
    expect(createEncounterRes.status).toBe(201);
    expect(createEncounterRes.body).toEqual(
      expect.objectContaining({
        status: "success",
        message: "Encounter created successfully",
        data: expect.objectContaining({
          encounter: expect.objectContaining({
            id: expect.any(String),
            patientNumber: expect.any(Number),
            referralId: null,
            state: "open",
            currentStep: "triage",
            urgency: "low",
            openedAt: expect.any(String),
          }),
        }),
      }),
    );

    // 2. SIDE EFFECTS
    const savedEncounter = await Encounter.findById(
      createEncounterRes.body.data.encounter.id,
    ).lean();
    expect(savedEncounter).not.toBeNull();
    expect(savedEncounter?.patientNumber).toBe(
      createEncounterRes.body.data.encounter.patientNumber,
    );

    // 3. Logic Check: Ensure no referral was accidentally linked
    expect(savedEncounter?.referralId).toBeNull();
    expect(savedEncounter?.hospitalId.toString()).toBe(
      nurse.hospitalId.toString(),
    );
    expect(savedEncounter?.initiator.toString()).toBe(nurse._id.toString());
  });

  it("should create encounter with existing referral for existing patient => Rutenga two patient => Kabyayi Nurse", async () => {
    logger.info(
      "----------------- Testing creation create encounter with existing user with existing referral -----------------",
    );
    // ARANGE

    // 1. Load Test Data
    const nurse = existingNurseTestData["kabwayi-HC-NURSE"];
    const shwRutenga = existingSHWTestData["rutenga-SHW"];

    const existingPatientOne = existingPatientsTestData["rutenga-two"];
    const hypertensionReadingsCritical =
      readingsTestData["hypertension-critical"];
    const diabetesReadingsCritical = readingsTestData["diabetes-critical"];
    const bmiReadingsCritical = readingsTestData["bmi-obesity-class-3"];

    const indicators = {
      hypertension: existingIndicatorTestData.hypertenssion,
      diabetes: existingIndicatorTestData.diabetes,
      bmi: existingIndicatorTestData.bmi,
    };

    // 2. Login as SHW to assessments
    logger.info("Constructing SHW login payload.");
    const shwPayload: ILoginPayload = {
      identifier: shwRutenga.credentials.phoneNumber,
      password: shwRutenga.credentials.password,
    };

    logger.info("Sending login request for SHW.");
    const shwToken = await loginByPhone(
      shwPayload.identifier,
      shwPayload.password,
    );

    logger.info("Creating first assessment (hypertension critical).");
    const assessmentHypertensionRes = await client()
      .post("/api/v1/assessments")
      .set("Authorization", `Bearer ${shwToken}`)
      .send({
        patientNumber: existingPatientOne.patientNumber,
        indicator: indicators.hypertension._id,
        readings: hypertensionReadingsCritical.readings,
      });

    expect(assessmentHypertensionRes.status).toBe(201);

    logger.info("Creating second assessment (diabetes critical).");
    const assessmentDiabetesRes = await client()
      .post("/api/v1/assessments")
      .set("Authorization", `Bearer ${shwToken}`)
      .send({
        patientNumber: existingPatientOne.patientNumber,
        indicator: indicators.diabetes._id,
        readings: diabetesReadingsCritical.readings,
      });

    expect(assessmentDiabetesRes.status).toBe(201);

    logger.info("Creating third assessment (bmi obesity class 3).");
    const assessmentBmiRes = await client()
      .post("/api/v1/assessments")
      .set("Authorization", `Bearer ${shwToken}`)
      .send({
        patientNumber: existingPatientOne.patientNumber,
        indicator: indicators.bmi._id,
        readings: bmiReadingsCritical.readings,
      });

    expect(assessmentBmiRes.status).toBe(201);

    logger.info("Fetching pending referral created by assessments.");
    const pendingReferral = await Referral.findOne({
      patientNumber: existingPatientOne.patientNumber,
      status: "PENDING",
    }).lean();

    expect(pendingReferral).not.toBeNull();

    // 3. Login as Nurse
    logger.info("Constructing nurse login payload.");
    const nursePayload: ILoginPayload = {
      identifier: nurse.credentials.phoneNumber,
      password: nurse.credentials.password,
    };

    logger.info("Sending login request for nurse.");
    const nurseToken = await loginByPhone(
      nursePayload.identifier,
      nursePayload.password,
    );

    // ACT
    // 1. Create encounter with existing referral for existing patient
    // a. Get the referral for the patient
    // b. Create encounter using the referral
    logger.info("Constructing encounter payload for existing patient.");
    const encounterPayload: CreateEncounterDTO = {
      patientNumber: existingPatientOne.patientNumber,
      urgency: "high",
    };

    logger.info("Sending request to create encounter with existing referral.");
    const createEncounterRes = await client()
      .post("/api/v1/encounters")
      .set("Authorization", `Bearer ${nurseToken}`)
      .send(encounterPayload);

    // ASSERT
    // 1. RESPONSE
    expect(createEncounterRes.status).toBe(201);
    expect(createEncounterRes.body).toEqual(
      expect.objectContaining({
        status: "success",
        message: "Encounter created successfully",
        data: expect.objectContaining({
          encounter: expect.objectContaining({
            id: expect.any(String),
            patientNumber: existingPatientOne.patientNumber,
            referralId: expect.any(String),
            state: "open",
            currentStep: "triage",
            urgency: "high",
            openedAt: expect.any(String),
          }),
        }),
      }),
    );

    // 2. SIDE EFFECTS
    const savedEncounter = await Encounter.findById(
      createEncounterRes.body.data.encounter.id,
    ).lean();

    expect(savedEncounter).not.toBeNull();
    expect(savedEncounter?.patientNumber).toBe(
      existingPatientOne.patientNumber,
    );

    // 3. Logic checks
    expect(savedEncounter?.referralId?.toString()).toBe(
      pendingReferral?._id.toString(),
    );
    expect(savedEncounter?.hospitalId.toString()).toBe(
      nurse.hospitalId.toString(),
    );
    expect(savedEncounter?.initiator.toString()).toBe(nurse._id.toString());

    const updatedReferral = await Referral.findById(
      pendingReferral?._id,
    ).lean();
    expect(updatedReferral?.status).toBe("COMPLETED");
  });
});

// 2. UNHAPPY PATH
// Not right hospital
// Pending referral, not due
// Validation
describe("INTEGRATION => POST: /api/v1/encounters - UNHAPPY PATH", () => {
  beforeEach(async () => {
    logger.info("Setting up fixtures for encounter unhappy path tests.");
    await runFixtureSetups();
    logger.info("Fixtures setup completed for encounter unhappy path tests.");
  });

  it("should reject encounter creation when referral belongs to a different hospital", async () => {
    logger.info(
      "----------------- Testing encounter creation with referral hospital mismatch -----------------",
    );

    // ARANGE
    const kabwayiNurse = existingNurseTestData["kabwayi-HC-NURSE"];
    const murambiShw = existingSHWTestData["murambi-SHW"];
    const murambiPatient = existingPatientsTestData["murambi-one"];
    const diabetesReadingsCritical = readingsTestData["diabetes-critical"];

    // 1. SHW creates assessment to generate a pending referral for murambi patient
    const shwPayload: ILoginPayload = {
      identifier: murambiShw.credentials.phoneNumber,
      password: murambiShw.credentials.password,
    };

    const shwToken = await loginByPhone(
      shwPayload.identifier,
      shwPayload.password,
    );

    const createAssessmentRes = await client()
      .post("/api/v1/assessments")
      .set("Authorization", `Bearer ${shwToken}`)
      .send({
        patientNumber: murambiPatient.patientNumber,
        indicator: existingIndicatorTestData.diabetes._id,
        readings: diabetesReadingsCritical.readings,
      });

    logger.debug(
      {
        status: createAssessmentRes.status,
        body: createAssessmentRes.body,
        patientNumber: murambiPatient.patientNumber,
      },
      "Assessment creation response for mismatch scenario",
    );

    expect(createAssessmentRes.status).toBe(201);

    const pendingReferral = await Referral.findOne({
      patientNumber: murambiPatient.patientNumber,
      status: "PENDING",
    }).lean();

    expect(pendingReferral).not.toBeNull();
    expect(pendingReferral?.to.toString()).not.toBe(
      kabwayiNurse.hospitalId.toString(),
    );

    // 2. Login as kabwayi nurse
    const nursePayload: ILoginPayload = {
      identifier: kabwayiNurse.credentials.phoneNumber,
      password: kabwayiNurse.credentials.password,
    };

    const nurseToken = await loginByPhone(
      nursePayload.identifier,
      nursePayload.password,
    );

    // ACT
    const encounterPayload: CreateEncounterDTO = {
      patientNumber: murambiPatient.patientNumber,
      urgency: "high",
      referralId: pendingReferral?._id.toString(),
    };

    const createEncounterRes = await client()
      .post("/api/v1/encounters")
      .set("Authorization", `Bearer ${nurseToken}`)
      .send(encounterPayload);

    logger.debug(
      {
        status: createEncounterRes.status,
        body: createEncounterRes.body,
        patientNumber: murambiPatient.patientNumber,
      },
      "Encounter creation response for mismatch scenario",
    );

    // ASSERT
    expect(createEncounterRes.status).toBe(400);
    expect(createEncounterRes.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t("referral_hospital_mismatch", {
          lng: TEST_LANG,
        }),
      }),
    );

    const savedEncounter = await Encounter.findOne({
      patientNumber: murambiPatient.patientNumber,
      state: "open",
    }).lean();
    expect(savedEncounter).toBeNull();

    const unchangedReferral = await Referral.findById(
      pendingReferral?._id,
    ).lean();
    expect(unchangedReferral?.status).toBe("PENDING");
  });

  it("should return 404 when creating encounter for a non-existing patient number", async () => {
    logger.info(
      "----------------- Testing encounter creation for non-existing patient number -----------------",
    );

    const nurse = existingNurseTestData["kabwayi-HC-NURSE"];
    const nonExistingPatientNumber = 999999;

    const nursePayload: ILoginPayload = {
      identifier: nurse.credentials.phoneNumber,
      password: nurse.credentials.password,
    };

    const token = await loginByPhone(
      nursePayload.identifier,
      nursePayload.password,
    );

    const createEncounterRes = await client()
      .post("/api/v1/encounters")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patientNumber: nonExistingPatientNumber,
        urgency: "low",
      } satisfies CreateEncounterDTO);

    logger.debug(
      {
        status: createEncounterRes.status,
        body: createEncounterRes.body,
        patientNumber: nonExistingPatientNumber,
      },
      "Encounter creation response for non-existing patient number scenario",
    );

    expect(createEncounterRes.status).toBe(404);
    expect(createEncounterRes.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t("patient_not_found", {
          lng: TEST_LANG,
        }),
      }),
    );

    const createdEncounter = await Encounter.findOne({
      patientNumber: nonExistingPatientNumber,
    }).lean();

    expect(createdEncounter).toBeNull();
  });

  it("should reject creation when referralId does not belong to the provided patient", async () => {
    logger.info(
      "----------------- Testing referralId/patientNumber mismatch rejection -----------------",
    );

    const nurse = existingNurseTestData["kabwayi-HC-NURSE"];
    const shw = existingSHWTestData["murambi-SHW"];
    const referralOwnerPatient = existingPatientsTestData["murambi-one"];
    const targetPatient = existingPatientsTestData["rutenga-one"];
    const diabetesReadingsCritical = readingsTestData["diabetes-critical"];

    // Create a pending referral for a different patient (referralOwnerPatient).
    const shwPayload: ILoginPayload = {
      identifier: shw.credentials.phoneNumber,
      password: shw.credentials.password,
    };

    const shwToken = await loginByPhone(
      shwPayload.identifier,
      shwPayload.password,
    );

    const createAssessmentRes = await client()
      .post("/api/v1/assessments")
      .set("Authorization", `Bearer ${shwToken}`)
      .send({
        patientNumber: referralOwnerPatient.patientNumber,
        indicator: existingIndicatorTestData.diabetes._id,
        readings: diabetesReadingsCritical.readings,
      });

    expect(createAssessmentRes.status).toBe(201);

    const pendingReferral = await Referral.findOne({
      patientNumber: referralOwnerPatient.patientNumber,
      status: "PENDING",
    }).lean();

    expect(pendingReferral).not.toBeNull();

    const nursePayload: ILoginPayload = {
      identifier: nurse.credentials.phoneNumber,
      password: nurse.credentials.password,
    };

    const nurseToken = await loginByPhone(
      nursePayload.identifier,
      nursePayload.password,
    );

    const createEncounterRes = await client()
      .post("/api/v1/encounters")
      .set("Authorization", `Bearer ${nurseToken}`)
      .send({
        patientNumber: targetPatient.patientNumber,
        urgency: "high",
        referralId: pendingReferral?._id.toString(),
      } satisfies CreateEncounterDTO);

    logger.debug(
      {
        status: createEncounterRes.status,
        body: createEncounterRes.body,
        targetPatientNumber: targetPatient.patientNumber,
        referralOwnerPatientNumber: referralOwnerPatient.patientNumber,
        referralId: pendingReferral?._id.toString(),
      },
      "Encounter creation response for referral/patient mismatch scenario",
    );

    expect(createEncounterRes.status).toBe(404);
    expect(createEncounterRes.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t(createEncounterRes.body.message, {
          lng: TEST_LANG,
        }),
      }),
    );

    const createdEncounter = await Encounter.findOne({
      patientNumber: targetPatient.patientNumber,
      state: "open",
    }).lean();
    expect(createdEncounter).toBeNull();

    const unchangedReferral = await Referral.findById(
      pendingReferral?._id,
    ).lean();
    expect(unchangedReferral?.status).toBe("PENDING");
  });

  it("should reject creation when referralId is not found", async () => {
    logger.info(
      "----------------- Testing referralId not found rejection -----------------",
    );

    const nurse = existingNurseTestData["kabwayi-HC-NURSE"];
    const patient = existingPatientsTestData["rutenga-one"];
    const nonExistingReferralId = "507f1f77bcf86cd799439011";

    const nursePayload: ILoginPayload = {
      identifier: nurse.credentials.phoneNumber,
      password: nurse.credentials.password,
    };

    const nurseToken = await loginByPhone(
      nursePayload.identifier,
      nursePayload.password,
    );

    const createEncounterRes = await client()
      .post("/api/v1/encounters")
      .set("Authorization", `Bearer ${nurseToken}`)
      .send({
        patientNumber: patient.patientNumber,
        urgency: "low",
        referralId: nonExistingReferralId,
      } satisfies CreateEncounterDTO);

    logger.debug(
      {
        status: createEncounterRes.status,
        body: createEncounterRes.body,
        patientNumber: patient.patientNumber,
        referralId: nonExistingReferralId,
      },
      "Encounter creation response for referralId not found scenario",
    );

    expect(createEncounterRes.status).toBe(404);
    expect(createEncounterRes.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t(createEncounterRes.body.message, {
          lng: TEST_LANG,
        }),
      }),
    );

    const createdEncounter = await Encounter.findOne({
      patientNumber: patient.patientNumber,
      referralId: nonExistingReferralId,
      state: "open",
    }).lean();
    expect(createdEncounter).toBeNull();
  });

  it("should reject encounter creation when requester is not a nurse", async () => {
    logger.info(
      "----------------- Testing encounter creation unauthorized role rejection -----------------",
    );

    const shw = existingSHWTestData["rutenga-SHW"];
    const patient = existingPatientsTestData["rutenga-one"];

    const shwPayload: ILoginPayload = {
      identifier: shw.credentials.phoneNumber,
      password: shw.credentials.password,
    };

    const shwToken = await loginByPhone(
      shwPayload.identifier,
      shwPayload.password,
    );

    const createEncounterRes = await client()
      .post("/api/v1/encounters")
      .set("Authorization", `Bearer ${shwToken}`)
      .send({
        patientNumber: patient.patientNumber,
        urgency: "high",
      } satisfies CreateEncounterDTO);

    logger.debug(
      {
        status: createEncounterRes.status,
        body: createEncounterRes.body,
        patientNumber: patient.patientNumber,
      },
      "Encounter creation response for unauthorized-role scenario",
    );

    expect(createEncounterRes.status).toBe(403);
    expect(createEncounterRes.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t("forbidden_action", {
          lng: TEST_LANG,
        }),
      }),
    );

    const createdEncounter = await Encounter.findOne({
      patientNumber: patient.patientNumber,
      state: "open",
    }).lean();
    expect(createdEncounter).toBeNull();
  });

  it("should return 401 when auth token is missing or invalid", async () => {
    logger.info(
      "----------------- Testing encounter creation auth token failures -----------------",
    );

    const patient = existingPatientsTestData["rutenga-one"];
    const encounterPayload = {
      patientNumber: patient.patientNumber,
      urgency: "high",
    } satisfies CreateEncounterDTO;

    const openEncountersBefore = await Encounter.find({
      patientNumber: patient.patientNumber,
      state: "open",
    }).lean();

    const missingTokenRes = await client()
      .post("/api/v1/encounters")
      .send(encounterPayload);

    logger.debug(
      {
        status: missingTokenRes.status,
        body: missingTokenRes.body,
        patientNumber: patient.patientNumber,
      },
      "Encounter creation response for missing-token scenario",
    );

    expect(missingTokenRes.status).toBe(401);
    expect(missingTokenRes.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: "Unauthenticated. Please log in to access this resource",
      }),
    );

    const invalidTokenRes = await client()
      .post("/api/v1/encounters")
      .set("Authorization", "Bearer invalid.token.value")
      .send(encounterPayload);

    logger.debug(
      {
        status: invalidTokenRes.status,
        body: invalidTokenRes.body,
        patientNumber: patient.patientNumber,
      },
      "Encounter creation response for invalid-token scenario",
    );

    expect(invalidTokenRes.status).toBe(401);
    expect(invalidTokenRes.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t("please_login", {
          lng: TEST_LANG,
        }),
      }),
    );

    const openEncountersAfter = await Encounter.find({
      patientNumber: patient.patientNumber,
      state: "open",
    }).lean();

    expect(openEncountersAfter).toHaveLength(openEncountersBefore.length);
  });

  it("should reject creation when patient already has an open encounter", async () => {
    logger.info(
      "----------------- Testing duplicate open encounter creation rejection -----------------",
    );

    // ARANGE
    const nurse = existingNurseTestData["kabwayi-HC-NURSE"];
    const patient = existingPatientsTestData["rutenga-one"];

    const nursePayload: ILoginPayload = {
      identifier: nurse.credentials.phoneNumber,
      password: nurse.credentials.password,
    };

    const token = await loginByPhone(
      nursePayload.identifier,
      nursePayload.password,
    );

    const firstEncounterPayload: CreateEncounterDTO = {
      patientNumber: patient.patientNumber,
      urgency: "low",
    };

    // ACT
    // 1) Create first (open) encounter
    const firstCreateRes = await client()
      .post("/api/v1/encounters")
      .set("Authorization", `Bearer ${token}`)
      .send(firstEncounterPayload);

    logger.debug(
      {
        status: firstCreateRes.status,
        body: firstCreateRes.body,
        patientNumber: patient.patientNumber,
      },
      "First encounter creation response in duplicate-open-encounter scenario",
    );

    expect(firstCreateRes.status).toBe(201);

    // 2) Try creating another encounter for the same patient
    const secondCreateRes = await client()
      .post("/api/v1/encounters")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patientNumber: patient.patientNumber,
        urgency: "high",
      } satisfies CreateEncounterDTO);

    logger.debug(
      {
        status: secondCreateRes.status,
        body: secondCreateRes.body,
        patientNumber: patient.patientNumber,
      },
      "Second encounter creation response in duplicate-open-encounter scenario",
    );

    // ASSERT
    expect(secondCreateRes.status).toBe(400);
    expect(secondCreateRes.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t(secondCreateRes.body.message, {
          lng: TEST_LANG,
        }),
      }),
    );

    const openEncounters = await Encounter.find({
      patientNumber: patient.patientNumber,
      state: "open",
    }).lean();

    logger.debug(
      {
        openEncountersCount: openEncounters.length,
        patientNumber: patient.patientNumber,
      },
      "Open encounters count after duplicate attempt",
    );

    expect(openEncounters).toHaveLength(1);
    expect(openEncounters[0]?._id.toString()).toBe(
      firstCreateRes.body.data.encounter.id,
    );
  });

  it("should return 400 validation failure for invalid payload schema", async () => {
    logger.info(
      "----------------- Testing encounter payload schema validation failures -----------------",
    );

    const nurse = existingNurseTestData["kabwayi-HC-NURSE"];
    const nursePayload: ILoginPayload = {
      identifier: nurse.credentials.phoneNumber,
      password: nurse.credentials.password,
    };

    const token = await loginByPhone(
      nursePayload.identifier,
      nursePayload.password,
    );

    for (const invalidCase of invalidEncounterPayloadCases) {
      logger.info({ caseName: invalidCase.name }, "Running validation case");

      const res = await client()
        .post("/api/v1/encounters")
        .set("Authorization", `Bearer ${token}`)
        .send(invalidCase.payload);

      logger.debug(
        {
          caseName: invalidCase.name,
          status: res.status,
          body: res.body,
        },
        "Validation case response",
      );

      expect(res.status).toBe(invalidCase.statusCode);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "fail",
          message: invalidCase.message,
        }),
      );
    }
  });
});

// TODO: WIll SHOW WARNING SO IN CASE IT IS URGENT, WE CAN STILL CREATE ENCOUNTER
// Referral is not pending
// Example: referral exists but status is IN_PROGRESS/COMPLETED.
// Expected: encounter creation rejected.
