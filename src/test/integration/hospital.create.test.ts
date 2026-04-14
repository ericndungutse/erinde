import { describe, expect, it, beforeEach } from "vitest";

import Hospital from "../../models/hospital.model.js";
import { ConstantValues } from "../../constants/constant.values.js";
import { HospitalType } from "../../types/hospital.types.js";
import { ACCOUNT_SETUP } from "../testDataSetup/account-setup.js";
import { setupTestData } from "../testDataSetup/index.js";
import { setupTestDB } from "../utils/mongo-memory.js";
import { loginByEmail, loginByPhone } from "../utils/auth-helpers.js";
import { client, TEST_LANG } from "../utils/request-factory.js";
import i18next from "../../i18n.js";

setupTestDB();

beforeEach(async () => {
  await setupTestData();
});

const validHospitalPayload = {
  name: "API Created Hospital",
  type: HospitalType.DISTRICT,
  address: {
    province: "kigali",
    district: "gasabo",
    sector: "kimironko",
    cell: "kibagabaga",
    village: "nyarutarama",
  },
};

describe("Integration: POST /api/v1/hospitals", () => {
  it("creates a hospital successfully (ADMIN)", async () => {
    const adminToken = await loginByEmail(
      ACCOUNT_SETUP.ADMIN!.contact.email!,
      ConstantValues.DEFAULT_PASSWORD,
    );

    const res = await client(adminToken)
      .post("/api/v1/hospitals")
      .send(validHospitalPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "success",
        message: "Hospital created successfully",
        data: expect.objectContaining({
          hospital: expect.objectContaining({
            _id: expect.any(String),
            name: validHospitalPayload.name.toLowerCase(),
            type: validHospitalPayload.type,
            address: expect.objectContaining(validHospitalPayload.address),
          }),
        }),
      }),
    );

    const saved = await Hospital.findOne({
      name: validHospitalPayload.name.toLowerCase(),
    }).lean();

    expect(saved).toBeTruthy();
    expect(saved?._id.toString()).toBe(res.body.data.hospital._id);
  });

  it("rejects when unauthorized (non-ADMIN)", async () => {
    const shwToken = await loginByPhone(
      ACCOUNT_SETUP.SOCIAL_HEALTH_WORKER_NYIRANUMA!.contact.phone,
      ConstantValues.DEFAULT_PASSWORD,
    );

    const res = await client(shwToken)
      .post("/api/v1/hospitals")
      .send(validHospitalPayload);

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: i18next.t("forbidden_action", {
          lng: TEST_LANG,
        }),
      }),
    );
  });

  it("rejects when unauthenticated (no token)", async () => {
    const res = await client()
      .post("/api/v1/hospitals")
      .send(validHospitalPayload);

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
      }),
    );
  });

  it("returns 400 with detailed validation errors", async () => {
    const adminToken = await loginByEmail(
      ACCOUNT_SETUP.ADMIN!.contact.email!,
      ConstantValues.DEFAULT_PASSWORD,
    );

    const invalidPayload = {
      name: "ab",
      type: HospitalType.DISTRICT,
      address: {
        province: "kigali",
        district: "ga",
        sector: "",
        cell: "",
        village: "",
      },
    };

    const res = await client(adminToken)
      .post("/api/v1/hospitals")
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "fail",
        message: "Validation failed",
        errors: expect.objectContaining({
          name: expect.any(String),
          "address.district": expect.any(String),
          "address.sector": expect.any(String),
          "address.cell": expect.any(String),
          "address.village": expect.any(String),
        }),
      }),
    );
  });
});
