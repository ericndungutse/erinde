import { beforeEach, describe, expect, it, vi } from "vitest";

import { setupTestDB } from "../utils/mongo-memory.js";
import { seedAuthTestUsers, TEST_USERS } from "../utils/seed-auth-users.js";
import { loginByEmail, loginByPhone } from "../utils/auth-helpers.js";
import { client, TEST_LANG } from "../utils/request-factory.js";
import i18next from "i18next";
import Account from "../../models/account.model.js";
import ClinicalProfile from "../../models/clinicalProfile.model.js";
import Counter from "../../models/counter.model.js";
import Hospital from "../../models/hospital.model.js";
import User, { Nurse } from "../../models/user.model.js";
import { HospitalType } from "../../types/hospital.types.js";
import { UserRole } from "../../types/roles.types.js";

// Initialize in-memory MongoDB for these tests
setupTestDB();

const validRegisterWithAccountPayload = {
  firstname: "Regina",
  lastname: "AdminCase",
  birthdate: "1991-04-04",
  address: {
    province: "kigali",
    district: "gasabo",
    sector: "kimironko",
    cell: "kibagabaga",
    village: "ruvumera",
  },
  contact: {
    phone: "0780001010",
    email: "regina.admincase@example.com",
  },
  nationalIdentificationNumber: "1199990000001010",
  roles: [UserRole.ADMIN],
};

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

const validNurseRegisterPayload = {
  firstname: "Nadine",
  lastname: "NurseCase",
  birthdate: "1992-06-06",
  address: {
    province: "kigali",
    district: "gasabo",
    sector: "kimironko",
    cell: "kibagabaga",
    village: "nyagatovu",
  },
  contact: {
    phone: "0780004040",
    email: "nadine.nursecase@example.com",
  },
  nationalIdentificationNumber: "1199990000004040",
  roles: [UserRole.NURSE],
};

beforeEach(async () => {
  await seedAuthTestUsers();
});

describe("Integration: POST /api/v1/users/admin/register", () => {
  it("registers a user with account successfully (ADMIN)", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

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
  });

  it("registers a user without email successfully (ADMIN)", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const payload = {
      ...validRegisterWithAccountPayload,
      contact: {
        phone: "0780001011",
      },
      nationalIdentificationNumber: "1199990000001011",
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
  });

  it("rolls back user and account creation when clinical profile setup fails", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );
    const payload = {
      ...validRegisterWithAccountPayload,
      contact: {
        phone: "0780003030",
        email: "rollback.admin.register@example.com",
      },
      nationalIdentificationNumber: "1199990000003030",
    };

    const counterSpy = vi
      .spyOn(Counter, "findByIdAndUpdate")
      .mockRejectedValueOnce(
        new Error("Forced counter failure for rollback test"),
      );

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
    expect(clinicalProfilesCount).toBe(0);
  });

  it("rejects when unauthenticated (no token)", async () => {
    const res = await client()
      .post("/api/v1/users/admin/register")
      .send(validRegisterWithAccountPayload);
    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
      }),
    );
  });

  it("rejects when unauthorized (non-ADMIN)", async () => {
    const shwToken = await loginByPhone(
      TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
      TEST_USERS.SOCIAL_HEALTH_WORKER.password,
    );

    const res = await client(shwToken)
      .post("/api/v1/users/admin/register")
      .send(validRegisterWithAccountPayload);

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: "You do not have permission to perform this action.",
      }),
    );
  });

  it("returns 400 with detailed validation errors", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const invalidPayload = {
      ...validRegisterWithAccountPayload,
      firstname: "",
      contact: { phone: "07800010ab", email: "not-an-email" },
      roles: [],
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
  });

  it("returns 400 when email already exists", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const payload = {
      ...validRegisterWithAccountPayload,
      contact: {
        phone: "0780001099", // unique phone
        email: TEST_USERS.ADMIN.email, // duplicate email
      },
      nationalIdentificationNumber: "1199990000001099", // unique NIN
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
  });

  it("returns 400 when phone number already exists", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const payload = {
      ...validRegisterWithAccountPayload,
      contact: {
        phone: TEST_USERS.ADMIN.phone, // duplicate phone
        email: "unique.email.admin.register@example.com", // unique email
      },
      nationalIdentificationNumber: "1199990000001088", // unique NIN
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
  });

  it("returns 400 when national identification number already exists", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const payload = {
      ...validRegisterWithAccountPayload,
      contact: {
        phone: "0780001022", // unique phone
        email: "unique2.email.admin.register@example.com", // unique email
      },
      nationalIdentificationNumber: TEST_USERS.ADMIN.nationalId, // duplicate NIN
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
  });

  it("merges provided roles with USER (SCREENING_VOLUNTEER, SOCIAL_HEALTH_WORKER)", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

    const payload = {
      ...validRegisterWithAccountPayload,
      contact: {
        phone: "0780002020",
        email: "multi.roles@example.com",
      },
      nationalIdentificationNumber: "1199990000002020",
      roles: [UserRole.SCREENING_VOLUNTEER, UserRole.SOCIAL_HEALTH_WORKER],
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
  });

  it("rejects nurse registration when hospitalId is missing", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );

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
  });

  it("registers a nurse with an assigned hospital (ADMIN)", async () => {
    const adminToken = await loginByEmail(
      TEST_USERS.ADMIN.email,
      TEST_USERS.ADMIN.password,
    );
    const hospital = await Hospital.create(validHospitalPayload);
    const payload = {
      ...validNurseRegisterPayload,
      hospitalId: hospital._id.toString(),
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
            roles: expect.arrayContaining([UserRole.USER, UserRole.NURSE]),
            hospitalId: hospital._id.toString(),
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
    expect(savedUser?.hospitalId?.toString()).toBe(hospital._id.toString());
  });
});
