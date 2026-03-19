import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConstantValues } from "../../constants/constant.values.js";
import Account from "../../models/account.model.js";
import ClinicalProfile from "../../models/clinicalProfile.model.js";
import Counter from "../../models/counter.model.js";
import Hospital from "../../models/hospital.model.js";
import User, { Nurse } from "../../models/user.model.js";
import i18next from "i18next";
import { HospitalType } from "../../types/hospital.types.js";
import { UserRole } from "../../types/roles.types.js";
import {
  runtimeUserAccounts,
  runtimePatients,
} from "../fixtures/runtime-test-data.js";
import { ACCOUNT_SETUP } from "../testDataSetup/account-setup.js";
import { setupTestData } from "../testDataSetup/index.js";
import { loginByEmail, loginByPhone } from "../utils/auth-helpers.js";
import { setupTestDB } from "../utils/mongo-memory.js";
import { client, TEST_LANG } from "../utils/request-factory.js";

// Initialize in-memory MongoDB for these tests
setupTestDB();

const validHospitalPayload = {
  name: "Kimironko District Hospital",
  type: HospitalType.DISTRICT,
  address: {
    province: "kigali",
    district: "gasabo",
    sector: "kimironko",
    cell: "kibagabaga",
    village: "ibuhoro",
  },
};

const COMMUNITY_HEALTH_UNIT_QUERY = "nyiranuma-biryogo";

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
  await setupTestData();
});

describe("Integration: POST /api/v1/users/admin/register", () => {
  it("registers a user with account successfully (ADMIN)", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const chu = await client(adminToken).get(
      `/api/v1/community-health-units?name=${COMMUNITY_HEALTH_UNIT_QUERY}`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const validRegisterWithAccountPayload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimeUserAccounts["admin-role-valid"],
    };

    const res = await client(adminToken)
      .post("/api/v1/users/admin/register")
      .send(validRegisterWithAccountPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "success",
        message: "User registered with account successfully",
        data: expect.objectContaining({
          user: expect.objectContaining({
            firstname: validRegisterWithAccountPayload.firstname,
            lastname: validRegisterWithAccountPayload.lastname,
            roles: expect.arrayContaining([UserRole.USER, UserRole.ADMIN]),
          }),
          account: expect.objectContaining({
            email: validRegisterWithAccountPayload.contact.email,
            phoneNumber: validRegisterWithAccountPayload.contact.phone,
            mustChangePassword: true,
          }),
          clinicalProfile: expect.objectContaining({
            patientNumber: expect.any(Number),
          }),
        }),
      }),
    );

    const savedUser = (await User.findOne({
      nationalIdentificationNumber:
        validRegisterWithAccountPayload.nationalIdentificationNumber,
    }).lean()) as {
      roles: UserRole[];
    } | null;

    const savedAccount = await Account.findOne({
      phoneNumber: validRegisterWithAccountPayload.contact.phone,
    }).lean();

    expect(savedUser).toBeTruthy();
    expect(savedUser?.roles).toEqual(
      expect.arrayContaining([UserRole.USER, UserRole.ADMIN]),
    );
    expect(savedAccount).toBeTruthy();
    expect(savedAccount?.mustChangePassword).toBe(true);
  });

  it("registers a user without email successfully (ADMIN)", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const chu = await client(adminToken).get(
      `/api/v1/community-health-units?name=${COMMUNITY_HEALTH_UNIT_QUERY}`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const payload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimeUserAccounts["admin-role-without-email"],
    };

    const res = await client(adminToken)
      .post("/api/v1/users/admin/register")
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "success",
        message: "User registered with account successfully",
        data: expect.objectContaining({
          user: expect.objectContaining({
            firstname: payload.firstname,
            lastname: payload.lastname,
            roles: expect.arrayContaining([UserRole.USER, UserRole.ADMIN]),
          }),
          account: expect.objectContaining({
            phoneNumber: payload.contact.phone,
            mustChangePassword: true,
          }),
          clinicalProfile: expect.objectContaining({
            patientNumber: expect.any(Number),
          }),
        }),
      }),
    );

    const savedUser = (await User.findOne({
      nationalIdentificationNumber: payload.nationalIdentificationNumber,
    }).lean()) as {
      roles: UserRole[];
    } | null;

    const savedAccount = await Account.findOne({
      phoneNumber: payload.contact.phone,
    }).lean();

    expect(savedUser).toBeTruthy();
    expect(savedUser?.roles).toEqual(
      expect.arrayContaining([UserRole.USER, UserRole.ADMIN]),
    );
    expect(savedAccount).toBeTruthy();
    expect(savedAccount?.email).toBeUndefined();
  });

  it("rolls back user and account creation when clinical profile setup fails", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const chu = await client(adminToken).get(
      `/api/v1/community-health-units?name=${COMMUNITY_HEALTH_UNIT_QUERY}`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const payload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimeUserAccounts["admin-role-rollback-test"],
    };

    const counterSpy = vi
      .spyOn(Counter, "findByIdAndUpdate")
      .mockRejectedValueOnce(
        new Error("Forced counter failure for rollback test"),
      );

    const initialClinicalProfilesCount = await ClinicalProfile.countDocuments();

    const res = await client(adminToken)
      .post("/api/v1/users/admin/register")
      .send(payload);

    counterSpy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "error",
        message: "Something went wrong",
      }),
    );

    const [user, account, clinicalProfilesCount] = await Promise.all([
      User.findOne({
        nationalIdentificationNumber: payload.nationalIdentificationNumber,
      }).lean(),
      Account.findOne({ phoneNumber: payload.contact.phone }).lean(),
      ClinicalProfile.countDocuments(),
    ]);

    expect(user).toBeNull();
    expect(account).toBeNull();
    expect(clinicalProfilesCount).toBe(initialClinicalProfilesCount);
  });

  it("rejects when unauthenticated (no token)", async () => {
    const payload = {
      ...runtimeUserAccounts["admin-role-valid"],
    };

    const res = await client()
      .post("/api/v1/users/admin/register")
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
      }),
    );

    const [savedUser, savedAccount] = await Promise.all([
      User.findOne({
        nationalIdentificationNumber: payload.nationalIdentificationNumber,
      }).lean(),
      Account.findOne({ phoneNumber: payload.contact.phone }).lean(),
    ]);

    expect(savedUser).toBeNull();
    expect(savedAccount).toBeNull();
  });

  it("rejects when unauthorized (non-ADMIN)", async () => {
    const shwToken = await loginByPhone(
      TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
      TEST_USERS.SOCIAL_HEALTH_WORKER.password,
    );

    const chu = await client(shwToken).get(
      `/api/v1/community-health-units?name=${COMMUNITY_HEALTH_UNIT_QUERY}`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const payload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimeUserAccounts["admin-role-valid"],
    };

    const res = await client(shwToken)
      .post("/api/v1/users/admin/register")
      .send(payload);

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: "You do not have permission to perform this action.",
      }),
    );

    const [savedUser, savedAccount] = await Promise.all([
      User.findOne({
        nationalIdentificationNumber: payload.nationalIdentificationNumber,
      }).lean(),
      Account.findOne({ phoneNumber: payload.contact.phone }).lean(),
    ]);

    expect(savedUser).toBeNull();
    expect(savedAccount).toBeNull();
  });

  it("returns 400 with detailed validation errors", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const chu = await client(adminToken).get(
      `/api/v1/community-health-units?name=${COMMUNITY_HEALTH_UNIT_QUERY}`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const invalidPayload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimeUserAccounts["invalid-admin-validation"],
    };

    const res = await client(adminToken)
      .post("/api/v1/users/admin/register")
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: "Validation failed",
        errors: expect.objectContaining({
          firstname: "First name is required",
          "contact.phone": "Phone number must contain only numbers",
          "contact.email": "Invalid email address",
          roles: "At least one role is required",
        }),
      }),
    );

    const [savedUser, savedAccount] = await Promise.all([
      User.findOne({
        nationalIdentificationNumber: invalidPayload.nationalIdentificationNumber,
      }).lean(),
      Account.findOne({ phoneNumber: invalidPayload.contact.phone }).lean(),
    ]);

    expect(savedUser).toBeNull();
    expect(savedAccount).toBeNull();
  });

  it("returns 400 when email already exists", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const chu = await client(adminToken).get(
      `/api/v1/community-health-units?name=${COMMUNITY_HEALTH_UNIT_QUERY}`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const payload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimeUserAccounts["admin-role-duplicate-email-test"],
      contact: {
        ...runtimeUserAccounts["admin-role-duplicate-email-test"].contact,
        email: TEST_USERS.ADMIN.email,
      },
    };

    const res = await client(adminToken)
      .post("/api/v1/users/admin/register")
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
      }),
    );

    const [savedUser, savedAccount] = await Promise.all([
      User.findOne({
        nationalIdentificationNumber: payload.nationalIdentificationNumber,
      }).lean(),
      Account.findOne({ phoneNumber: payload.contact.phone }).lean(),
    ]);

    expect(savedUser).toBeNull();
    expect(savedAccount).toBeNull();
  });

  it("returns 400 when phone number already exists", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const chu = await client(adminToken).get(
      `/api/v1/community-health-units?name=${COMMUNITY_HEALTH_UNIT_QUERY}`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const payload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimeUserAccounts["admin-role-duplicate-phone-test"],
      contact: {
        ...runtimeUserAccounts["admin-role-duplicate-phone-test"].contact,
        phone: TEST_USERS.ADMIN.phone,
      },
    };

    const res = await client(adminToken)
      .post("/api/v1/users/admin/register")
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t("phone_number_exists", {
          phone_number: payload.contact.phone,
          lng: TEST_LANG,
        }),
      }),
    );

    const [savedUser, savedAccount] = await Promise.all([
      User.findOne({
        nationalIdentificationNumber: payload.nationalIdentificationNumber,
      }).lean(),
      Account.findOne({ email: payload.contact.email }).lean(),
    ]);

    expect(savedUser).toBeNull();
    expect(savedAccount).toBeNull();
  });

  it("returns 400 when national identification number already exists", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const chu = await client(adminToken).get(
      `/api/v1/community-health-units?name=${COMMUNITY_HEALTH_UNIT_QUERY}`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const payload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimeUserAccounts["admin-role-duplicate-nin-test"],
      nationalIdentificationNumber: TEST_USERS.ADMIN.nationalId,
    };

    const res = await client(adminToken)
      .post("/api/v1/users/admin/register")
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
      }),
    );

    const savedAccount = await Account.findOne({
      phoneNumber: payload.contact.phone,
    }).lean();

    expect(savedAccount).toBeNull();
  });

  it("merges provided roles with USER (SCREENING_VOLUNTEER, SOCIAL_HEALTH_WORKER)", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const chu = await client(adminToken).get(
      `/api/v1/community-health-units?name=${COMMUNITY_HEALTH_UNIT_QUERY}`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const payload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimeUserAccounts["multi-role-screening-social-health"],
    };
    const res = await client(adminToken)
      .post("/api/v1/users/admin/register")
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "success",
        data: expect.objectContaining({
          user: expect.objectContaining({
            roles: expect.arrayContaining([
              UserRole.USER,
              UserRole.SCREENING_VOLUNTEER,
              UserRole.SOCIAL_HEALTH_WORKER,
            ]),
          }),
        }),
      }),
    );

    const savedUser = (await User.findOne({
      nationalIdentificationNumber: payload.nationalIdentificationNumber,
    }).lean()) as {
      roles: UserRole[];
    } | null;

    const savedAccount = await Account.findOne({
      phoneNumber: payload.contact.phone,
    }).lean();

    expect(savedUser).toBeTruthy();
    expect(savedUser?.roles).toEqual(
      expect.arrayContaining([
        UserRole.USER,
        UserRole.SCREENING_VOLUNTEER,
        UserRole.SOCIAL_HEALTH_WORKER,
      ]),
    );
    expect(savedAccount).toBeTruthy();
  });

  it("rejects nurse registration when hospitalId is missing", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const chu = await client(adminToken).get(
      `/api/v1/community-health-units?name=${COMMUNITY_HEALTH_UNIT_QUERY}`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const validNurseRegisterPayload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimeUserAccounts["nurse-role-valid"],
    };

    const res = await client(adminToken)
      .post("/api/v1/users/admin/register")
      .send(validNurseRegisterPayload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      status: "fail",
      message: "Validation failed",
      errors: {
        hospitalId: i18next.t("hospital_id_required", { lng: TEST_LANG }),
      },
    });

    const [savedNurse, savedAccount] = await Promise.all([
      Nurse.findOne({
        nationalIdentificationNumber:
          validNurseRegisterPayload.nationalIdentificationNumber,
      }).lean(),
      Account.findOne({
        phoneNumber: validNurseRegisterPayload.contact.phone,
      }).lean(),
    ]);

    expect(savedNurse).toBeNull();
    expect(savedAccount).toBeNull();
  });

  it("registers a nurse with an assigned hospital (ADMIN)", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const chu = await client(adminToken).get(
      `/api/v1/community-health-units?name=${COMMUNITY_HEALTH_UNIT_QUERY}`,
    );

    expect(chu.status).toBe(200);
    expect(chu.body.data.communityHealthUnits).toBeInstanceOf(Array);

    const hospitalsRes = await client(adminToken).get(`/api/v1/hospitals`);

    expect(hospitalsRes.status).toBe(200);
    expect(hospitalsRes.body.data.hospitals).toBeInstanceOf(Array);
    expect(hospitalsRes.body.data.hospitals.length).toBeGreaterThan(0);

    const hospital = hospitalsRes.body.data.hospitals[0];
    const hospitalId = hospital._id.toString();

    const payload = {
      communityHealthUnit: chu.body.data.communityHealthUnits[0].id,
      ...runtimeUserAccounts["nurse-role-with-hospital"],
      hospitalId: hospitalId,
    };

    const res = await client(adminToken)
      .post("/api/v1/users/admin/register")
      .send(payload);

    // API response assertions
    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "success",
        message: "User registered with account successfully",
        data: expect.objectContaining({
          user: expect.objectContaining({
            firstname: payload.firstname,
            lastname: payload.lastname,
            roles: expect.arrayContaining([UserRole.USER, UserRole.NURSE]),
            hospitalId: hospitalId,
          }),
          account: expect.objectContaining({
            email: payload.contact.email,
            phoneNumber: payload.contact.phone,
            mustChangePassword: true,
          }),
          clinicalProfile: expect.objectContaining({
            patientNumber: expect.any(Number),
          }),
        }),
      }),
    );

    // Persistence assertion (also commonly: database state assertion).
    const savedUser = (await Nurse.findOne({
      nationalIdentificationNumber: payload.nationalIdentificationNumber,
    }).lean()) as {
      hospitalId?: { toString(): string } | string;
      roles: UserRole[];
    } | null;

    expect(savedUser).toBeTruthy();
    expect(savedUser?.roles).toEqual(
      expect.arrayContaining([UserRole.USER, UserRole.NURSE]),
    );
    expect(savedUser?.hospitalId?.toString()).toBe(hospitalId);

    const savedAccount = await Account.findOne({
      phoneNumber: payload.contact.phone,
    }).lean();

    expect(savedAccount).toBeTruthy();
    expect(savedAccount?.mustChangePassword).toBe(true);
  });
});
