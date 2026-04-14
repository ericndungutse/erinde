import { faker } from "@faker-js/faker";
import type { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { ConstantValues } from "../../constants/constant.values.js";
import type { RegisterUserDTO } from "../../dto/user.dto.js";
import i18next from "../../i18n.js";
import ClinicalProfile from "../../models/clinicalProfile.model.js";
import User from "../../models/user.model.js";
import {
  runtimePatients,
  runTimeRandomPhoneNumbers,
} from "../fixtures/runtime-test-data.js";
import { ACCOUNT_SETUP } from "../testDataSetup/account-setup.js";
import { setupTestData } from "../testDataSetup/index.js";
import { loginByEmail, loginByPhone } from "../utils/auth-helpers.js";
import { setupTestDB } from "../utils/mongo-memory.js";
import { client, TEST_LANG } from "../utils/request-factory.js";

// Initialize in-memory MongoDB for these tests
setupTestDB();

const TEST_USERS = {
  ADMIN: {
    email: ACCOUNT_SETUP.ADMIN!.contact.email!,
    phone: ACCOUNT_SETUP.ADMIN!.contact.phone,
    nationalId: ACCOUNT_SETUP.ADMIN!.nationalIdentificationNumber,
    password: ConstantValues.DEFAULT_PASSWORD,
  },
  SOCIAL_HEALTH_WORKER: {
    phone: ACCOUNT_SETUP.SOCIAL_HEALTH_WORKER_NYIRANUMA!.contact.phone,
    password: ConstantValues.DEFAULT_PASSWORD,
  },
} as const;

beforeEach(async () => {
  // Setup test data
  await setupTestData();
});

describe("Integration: POST /api/v1/users", () => {
  // User Logs in
  it("registers a user with authorized role (SOCIAL_HEALTH_WORKER)", async () => {
    const token = await loginByPhone(
      TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
      TEST_USERS.SOCIAL_HEALTH_WORKER.password,
    );

    // User Searches for a CHU of the village-cell of new user
    const chu = await client(token).get(
      `/api/v1/community-health-units?name=nyiranuma`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    // User enters the information of the new user and submits the form
    const validRegisterPayload: RegisterUserDTO = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0]._id,
      ...runtimePatients["nyiranuma-biryogo-valid"],
    };

    const res = await client(token)
      .post("/api/v1/users")
      .send(validRegisterPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "success",
        data: expect.objectContaining({
          patientNumber: expect.objectContaining({
            patientNumber: expect.any(Number),
          }),
        }),
      }),
    );

    const savedUser = (await User.findOne({
      nationalIdentificationNumber:
        validRegisterPayload.nationalIdentificationNumber,
    }).lean()) as {
      _id: Types.ObjectId;
      roles: string[];
    } | null;

    expect(savedUser).toBeTruthy();

    const savedClinicalProfile = await ClinicalProfile.findOne({
      userId: savedUser!._id,
    }).lean();

    expect(savedUser?.roles).toEqual(expect.arrayContaining(["USER"]));
    expect(savedClinicalProfile).toBeTruthy();
    expect(savedClinicalProfile?.patientNumber).toBe(
      res.body.data.patientNumber.patientNumber,
    );
  });

  it("registers a user without email provided (SOCIAL_HEALTH_WORKER)", async () => {
    const token = await loginByPhone(
      TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
      TEST_USERS.SOCIAL_HEALTH_WORKER.password,
    );

    // User Searches for a CHU of the village-cell of new user
    const chu = await client(token).get(
      `/api/v1/community-health-units?name=nyiranuma`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    // User enters the information of the new user and submits the form
    const validRegisterPayload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0]._id,
      ...runtimePatients["nyiranuma-biryogo-valid"],
    };
    const res = await client(token)
      .post("/api/v1/users")
      .send(validRegisterPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "success",
        data: expect.objectContaining({
          patientNumber: expect.objectContaining({
            patientNumber: expect.any(Number),
          }),
        }),
      }),
    );

    const savedUser = (await User.findOne({
      nationalIdentificationNumber:
        validRegisterPayload.nationalIdentificationNumber,
    }).lean()) as {
      _id: Types.ObjectId;
      roles: string[];
    } | null;

    expect(savedUser).toBeTruthy();

    const savedClinicalProfile = await ClinicalProfile.findOne({
      userId: savedUser!._id,
    }).lean();

    expect(savedUser?.roles).toEqual(expect.arrayContaining(["USER"]));
    expect(savedClinicalProfile).toBeTruthy();
  });

  it("rejects registration if role is not authorized (ADMIN)", async () => {
    const token = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    // User Searches for a CHU of the village-cell of new user
    const chu = await client(token).get(
      `/api/v1/community-health-units?name=nyiranuma`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    // User enters the information of the new user and submits the form
    const validRegisterPayload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0]._id,
      ...runtimePatients["nyiranuma-biryogo-valid"],
    };

    const res = await client(token)
      .post("/api/v1/users")
      .send(validRegisterPayload);

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t("forbidden_action", {
          lng: TEST_LANG,
        }),
      }),
    );

    const savedUser = await User.findOne({
      nationalIdentificationNumber:
        validRegisterPayload.nationalIdentificationNumber,
    }).lean();

    expect(savedUser).toBeNull();
  });

  it("rejects registration with invalid body (validation fails) and returns detailed errors", async () => {
    const token = await loginByPhone(
      TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
      TEST_USERS.SOCIAL_HEALTH_WORKER.password,
    );

    // User Searches for a CHU of the village-cell of new user
    const chu = await client(token).get(
      `/api/v1/community-health-units?name=nyiranuma-biryogo`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const invalidPayload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0]._id,
      ...runtimePatients["nyiranuma-biryogo-invalid-body"],
    };

    const res = await client(token).post("/api/v1/users").send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: "Validation failed",
        errors: expect.objectContaining({
          firstname: "First name is required",
          "contact.phone": "Phone number must contain only numbers",
          "contact.email": "Invalid email address",
        }),
      }),
    );

    const savedUser = await User.findOne({
      nationalIdentificationNumber: invalidPayload.nationalIdentificationNumber,
    }).lean();

    expect(savedUser).toBeNull();
  });

  it("rejects registration when unauthenticated (no token)", async () => {
    const invalidPayload = {
      ...runtimePatients["nyiranuma-biryogo-valid"],
    };
    const res = await client().post("/api/v1/users").send(invalidPayload);
    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
      }),
    );

    const savedUser = await User.findOne({
      nationalIdentificationNumber: invalidPayload.nationalIdentificationNumber,
    }).lean();

    expect(savedUser).toBeNull();
  });

  it("returns 400 when email already exists", async () => {
    const token = await loginByPhone(
      TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
      TEST_USERS.SOCIAL_HEALTH_WORKER.password,
    );

    // User Searches for a CHU of the village-cell of new user
    const chu = await client(token).get(
      `/api/v1/community-health-units?name=nyiranuma-biryogo`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const validateBody = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0]._id,
      ...runtimePatients["nyiranuma-biryogo-valid"],
    };

    const firstRequest = await client(token)
      .post("/api/v1/users")
      .send({
        ...validateBody,
        contact: {
          ...runtimePatients["nyiranuma-biryogo-valid"].contact,
          phone: runTimeRandomPhoneNumbers.one,
        },
      });

    expect(firstRequest.status).toBe(201);

    const duplicateRequest = await client(token)
      .post("/api/v1/users")
      .send(validateBody);

    expect(duplicateRequest.status).toBe(400);
    expect(duplicateRequest.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t("email_exists", {
          email: validateBody.contact.email,
          lng: TEST_LANG,
        }),
      }),
    );

    const persistedUsers = await User.find({
      nationalIdentificationNumber: validateBody.nationalIdentificationNumber,
    }).lean();

    expect(persistedUsers).toHaveLength(1);

    const persistedUser = persistedUsers[0];
    expect(persistedUser).toBeTruthy();

    const persistedClinicalProfiles = await ClinicalProfile.find({
      userId: persistedUser!._id,
    }).lean();

    expect(persistedClinicalProfiles).toHaveLength(1);
  });

  it("returns 400 when phone number already exists", async () => {
    const token = await loginByPhone(
      TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
      TEST_USERS.SOCIAL_HEALTH_WORKER.password,
    );

    // User Searches for a CHU of the village-cell of new user
    const chu = await client(token).get(
      `/api/v1/community-health-units?name=nyiranuma-biryogo`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const validateBody = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0]._id,
      ...runtimePatients["nyiranuma-biryogo-valid"],
    };

    const firstRequest = await client(token)
      .post("/api/v1/users")
      .send({
        ...validateBody,
        contact: {
          ...runtimePatients["nyiranuma-biryogo-valid"].contact,
          email: faker.internet.email(),
        },
      });

    expect(firstRequest.status).toBe(201);

    const duplicateRequest = await client(token)
      .post("/api/v1/users")
      .send(validateBody);

    expect(duplicateRequest.status).toBe(400);
    expect(duplicateRequest.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t("phone_number_exists", {
          phone_number: validateBody.contact.phone,
          lng: TEST_LANG,
        }),
      }),
    );

    const persistedUsers = await User.find({
      nationalIdentificationNumber: validateBody.nationalIdentificationNumber,
    }).lean();

    expect(persistedUsers).toHaveLength(1);

    const persistedUser = persistedUsers[0];
    expect(persistedUser).toBeTruthy();

    const persistedClinicalProfiles = await ClinicalProfile.find({
      userId: persistedUser!._id,
    }).lean();

    expect(persistedClinicalProfiles).toHaveLength(1);
  });

  it("returns 400 when national identification number already exists", async () => {
    const token = await loginByPhone(
      TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
      TEST_USERS.SOCIAL_HEALTH_WORKER.password,
    );

    // User Searches for a CHU of the village-cell of new user
    const chu = await client(token).get(
      `/api/v1/community-health-units?name=nyiranuma-biryogo`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const validateBody = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0]._id,
      ...runtimePatients["nyiranuma-biryogo-valid"],
    };

    const firstRequest = await client(token)
      .post("/api/v1/users")
      .send({
        ...validateBody,
        contact: {
          phone: runTimeRandomPhoneNumbers.one,
          email: faker.internet.email(),
        },
      });

    expect(firstRequest.status).toBe(201);

    const duplicateRequest = await client(token)
      .post("/api/v1/users")
      .send(validateBody);

    expect(duplicateRequest.status).toBe(400);
    expect(duplicateRequest.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t("national_identification_number_exists", {
          national_identification_number:
            validateBody.nationalIdentificationNumber,
          lng: TEST_LANG,
        }),
      }),
    );

    const persistedUsers = await User.find({
      nationalIdentificationNumber: validateBody.nationalIdentificationNumber,
    }).lean();

    expect(persistedUsers).toHaveLength(1);

    const persistedUser = persistedUsers[0];
    expect(persistedUser).toBeTruthy();

    const persistedClinicalProfiles = await ClinicalProfile.find({
      userId: persistedUser!._id,
    }).lean();

    expect(persistedClinicalProfiles).toHaveLength(1);
  });
});
