import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import i18next from "../../i18n.js";

import app from "../../app.js";
import { ConstantValues } from "../../constants/constant.values.js";
import { ACCOUNT_SETUP } from "../testDataSetup/account-setup.js";
import { setupTestData } from "../testDataSetup/index.js";
import { loginByPhone } from "../utils/auth-helpers.js";
import { setupTestDB } from "../utils/mongo-memory.js";
import { TEST_LANG } from "../utils/request-factory.js";

// Initialize in-memory MongoDB for these tests
setupTestDB();

const TEST_USERS = {
  SOCIAL_HEALTH_WORKER: {
    phone: ACCOUNT_SETUP.SOCIAL_HEALTH_WORKER_NYIRANUMA!.contact.phone,
    password: ConstantValues.DEFAULT_PASSWORD,
  },
} as const;

const validRegisterPayload = {
  firstname: "Jane",
  lastname: "Doe",
  birthdate: "1992-02-02",
  address: {
    province: "kigali",
    district: "gasabo",
    sector: "kimironko",
    cell: "kibagabaga",
    village: "nyarutarama",
  },
  contact: {
    phone: "0780000030",
    email: "jane.doe@example.com",
  },
  nationalIdentificationNumber: "1199990000000030",
};

beforeEach(async () => {
  await setupTestData();
});

describe("Integration: GET /api/v1/users/:patientNumber", () => {
  it("returns user details for a valid patient number", async () => {
    const token = await loginByPhone(
      TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
      TEST_USERS.SOCIAL_HEALTH_WORKER.password,
    );

    const chuRes = await request(app)
      .get("/api/v1/community-health-units")
      .set("Authorization", `Bearer ${token}`);

    expect(chuRes.status).toBe(200);
    const communityHealthUnits = chuRes.body.data.communityHealthUnits;
    expect(Array.isArray(communityHealthUnits)).toBe(true);
    expect(communityHealthUnits.length).toBeGreaterThan(0);
    const communityHealthUnitId = communityHealthUnits[0]._id;

    // First register a user to obtain a patient number
    const regRes = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...validRegisterPayload,
        communityHealthUnit: communityHealthUnitId,
      });

    expect(regRes.status).toBe(201);
    const patientNumber: number = regRes.body.data.patientNumber
      .patientNumber as number;
    expect(typeof patientNumber).toBe("number");

    // Fetch user by patient number
    const res = await request(app).get(`/api/v1/users/${patientNumber}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "success",
        data: {
          user: expect.objectContaining({
            nationalIdentificationNumber:
              validRegisterPayload.nationalIdentificationNumber,
            firstname: validRegisterPayload.firstname,
            lastname: validRegisterPayload.lastname,
            phone: validRegisterPayload.contact.phone,
          }),
        },
      }),
    );
  });

  it("returns 404 when patient number is not found", async () => {
    const res = await request(app).get("/api/v1/users/999999");
    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t(res.body.message, { lng: TEST_LANG }),
      }),
    );
  });

  it("returns 500 when patient number is not a valid number (casting error)", async () => {
    const res = await request(app).get("/api/v1/users/abc");
    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "error",
      }),
    );
  });

  // moved: healthWorkerId linkage assertion now covered in user.register.test.ts
});
