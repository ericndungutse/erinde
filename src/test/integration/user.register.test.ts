import { beforeEach, describe, expect, it } from "vitest";

import { ConstantValues } from "../../constants/constant.values.js";
import i18next from "../../i18n.js";
import ClinicalProfile from "../../models/clinicalProfile.model.js";
import CommunityHealthUnit from "../../models/communitHealthUnit.model.js";
import User from "../../models/user.model.js";
import { ACCOUNT_SETUP } from "../testDataSetup/account-setup.js";
import { setupTestData } from "../testDataSetup/index.js";
import { loginByEmail, loginByPhone } from "../utils/auth-helpers.js";
import { setupTestDB } from "../utils/mongo-memory.js";
import { client, TEST_LANG } from "../utils/request-factory.js";
import { UserRole } from "../../types/roles.types.js";
import { runtimePatients } from "../fixtures/runtime-test-data.js";

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
    const validRegisterPayload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
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
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
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
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimePatients["nyiranuma-biryogo-valid"],
    };

    const res = await client(token)
      .post("/api/v1/users")
      .send(validRegisterPayload);

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: "You do not have permission to perform this action.",
      }),
    );
  });

  it("rejects registration with invalid body (validation fails) and returns detailed errors", async () => {
    const token = await loginByPhone(
      TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
      TEST_USERS.SOCIAL_HEALTH_WORKER.password,
    );

    const invalidPayload = {
      ...validRegisterPayload,
      firstname: "", // invalid: triggers "First name is required"
      // phone: keep 10 chars but include non-digit to trigger regex-only error
      contact: { phone: "078000001a", email: "not-an-email" },
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
  });

  // it("rejects registration when unauthenticated (no token)", async () => {
  //   const res = await client().post("/api/v1/users").send(validRegisterPayload);

  //   expect(res.status).toBe(401);
  //   expect(res.body).toEqual(
  //     expect.objectContaining({
  //       status: "fail",
  //     }),
  //   );
  // });

  // it("returns 400 when email already exists", async () => {
  //   const token = await loginByPhone(
  //     TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
  //     TEST_USERS.SOCIAL_HEALTH_WORKER.password,
  //   );

  //   const duplicateEmailPayload = {
  //     ...validRegisterPayload,
  //     contact: {
  //       phone: "0780000099", // unique phone
  //       email: TEST_USERS.ADMIN.email, // duplicate email
  //     },
  //     nationalIdentificationNumber: "1199990000000099", // unique NIN
  //   };

  //   const res = await client(token)
  //     .post("/api/v1/users")
  //     .send(duplicateEmailPayload);

  //   expect(res.status).toBe(400);
  //   expect(res.body).toEqual(
  //     expect.objectContaining({
  //       status: "fail",
  //       message: i18next.t("email_exists", {
  //         email: duplicateEmailPayload.contact.email,
  //         lng: TEST_LANG,
  //       }),
  //     }),
  //   );
  // });

  // it("returns 400 when phone number already exists", async () => {
  //   const token = await loginByPhone(
  //     TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
  //     TEST_USERS.SOCIAL_HEALTH_WORKER.password,
  //   );

  //   const duplicatePhonePayload = {
  //     ...validRegisterPayload,
  //     contact: {
  //       phone: TEST_USERS.ADMIN.phone, // duplicate phone
  //       email: "unique.email@example.com", // unique email
  //     },
  //     nationalIdentificationNumber: "1199990000000088", // unique NIN
  //   };

  //   const res = await client(token)
  //     .post("/api/v1/users")
  //     .send(duplicatePhonePayload);

  //   expect(res.status).toBe(400);
  //   expect(res.body).toEqual(
  //     expect.objectContaining({
  //       message: i18next.t("phone_number_exists", {
  //         phone_number: duplicatePhonePayload.contact.phone,
  //         lng: TEST_LANG,
  //       }),
  //     }),
  //   );
  // });

  // it("returns 400 when national identification number already exists", async () => {
  //   const token = await loginByPhone(
  //     TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
  //     TEST_USERS.SOCIAL_HEALTH_WORKER.password,
  //   );

  //   const duplicateNinPayload = {
  //     ...validRegisterPayload,
  //     contact: {
  //       phone: "0780000022", // unique phone
  //       email: "unique2.email@example.com", // unique email
  //     },
  //     nationalIdentificationNumber: TEST_USERS.ADMIN.nationalId, // duplicate NIN
  //   };

  //   const res = await client(token)
  //     .post("/api/v1/users")
  //     .send(duplicateNinPayload);

  //   expect(res.status).toBe(400);
  //   expect(res.body).toEqual(
  //     expect.objectContaining({
  //       status: "fail",
  //       message: i18next.t("national_identification_number_exists", {
  //         national_identification_number:
  //           duplicateNinPayload.nationalIdentificationNumber,
  //         lng: TEST_LANG,
  //       }),
  //     }),
  //   );
  // });

  // it("sets healthWorkerId in clinical profile when SHW exists in same village (ruvumera)", async () => {
  //   const token = await loginByPhone(
  //     TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
  //     TEST_USERS.SOCIAL_HEALTH_WORKER.password,
  //   );

  //   // Create a Social Health Worker in target village
  //   const shw = await User.create({
  //     firstname: "Village",
  //     lastname: "Worker",
  //     birthdate: new Date("1985-05-05"),
  //     address: {
  //       province: "kigali",
  //       district: "gasabo",
  //       sector: "kimironko",
  //       cell: "kibagabaga",
  //       village: "ruvumera",
  //     },
  //     contact: {
  //       phone: "0780000044",
  //       email: "shw.ruvumera@example.com",
  //     },
  //     nationalIdentificationNumber: "1199990000000044",
  //     roles: [UserRole.SOCIAL_HEALTH_WORKER],
  //     communityHealthUnit: "507f1f77bcf86cd799439099",
  //   });

  //   const payload = {
  //     firstname: "Alice",
  //     lastname: "Patient",
  //     birthdate: "1993-03-03",
  //     address: {
  //       province: "kigali",
  //       district: "gasabo",
  //       sector: "kimironko",
  //       cell: "kibagabaga",
  //       village: "ruvumera", // matches SHW village
  //     },
  //     contact: {
  //       phone: "0780000055",
  //       email: "alice.patient@example.com",
  //     },
  //     nationalIdentificationNumber: "1199990000000055",
  //     communityHealthUnit: validRegisterPayload.communityHealthUnit,
  //   };

  //   const regRes = await client(token).post("/api/v1/users").send(payload);

  //   expect(regRes.status).toBe(201);
  //   const patientNumber: number = regRes.body.data.patientNumber
  //     .patientNumber as number;

  //   const profile = await ClinicalProfile.findOne({ patientNumber }).lean();
  //   expect(profile).toBeTruthy();
  // });
});
