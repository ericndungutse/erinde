import { describe, it, expect, beforeAll } from "vitest";
import { client } from "../utils/request-factory.js";
import type { ILoginPayload } from "../../types/auth.types.js";
import {
  existingNurseTestData,
  existingPatientsTestData,
} from "../fixtures/runtime-test-data-v2.js";
import { logger } from "../../logger.js";
import { runFixtureSetups } from "../fixtures/setup/index.js";
import { setupTestDB } from "../utils/mongo-memory.js";
import type { CreateEncounterDTO } from "../../dto/encounter.dto.js";
import { loginByPhone } from "../utils/auth-helpers.js";
import Encounter from "../../models/encounter.model.js";

setupTestDB();

describe("INTEGRATION => POST: /api/v1/encounters", () => {
  beforeAll(async () => {
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
  });
});
