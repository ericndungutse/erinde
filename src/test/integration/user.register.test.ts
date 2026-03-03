import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import app from '../../app.js';
import { setupTestDB } from '../utils/mongo-memory.js';
import { seedAuthTestUsers, TEST_USERS } from '../utils/seed-auth-users.js';
import { loginByEmail, loginByPhone } from '../utils/auth-helpers.js';
import User from '../../models/user.model.js';
import ClinicalProfile from '../../models/clinicalProfile.model.js';
import { AccountRole } from '../../types/user.types.js';

// Initialize in-memory MongoDB for these tests
setupTestDB();

// login helpers moved to ../utils/auth-helpers.ts for reuse

const validRegisterPayload = {
  firstname: 'John',
  lastname: 'Doe',
  birthdate: '1990-01-01',
  address: {
    province: 'kigali',
    district: 'gasabo',
    sector: 'kimironko',
    cell: 'kibagabaga',
    village: 'nyarutarama',
  },
  contact: {
    phone: '0780000010',
    email: 'john.doe@example.com',
  },
  nationalIdentificationNumber: '1199990000000010',
};

beforeEach(async () => {
  await seedAuthTestUsers();
});

describe('Integration: POST /api/v1/users', () => {
  it('registers a user with authorized role (SOCIAL_HEALTH_WORKER)', async () => {
    const token = await loginByPhone(TEST_USERS.SOCIAL_HEALTH_WORKER.phone, TEST_USERS.SOCIAL_HEALTH_WORKER.password);

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send(validRegisterPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          patientNumber: expect.objectContaining({
            patientNumber: expect.any(Number),
          }),
        }),
      }),
    );
  });


  it('registers a user without email provided (SOCIAL_HEALTH_WORKER)', async () => {
    const token = await loginByPhone(TEST_USERS.SOCIAL_HEALTH_WORKER.phone, TEST_USERS.SOCIAL_HEALTH_WORKER.password);
    const payloadWithoutEmail = {
      ...validRegisterPayload,
      contact: {
        phone: '0780000011',
      },
    };
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send(payloadWithoutEmail);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          patientNumber: expect.objectContaining({
            patientNumber: expect.any(Number),
          }),
        }),
      }),
    );
  });

  it('rejects registration if role is not authorized (ADMIN)', async () => {
    const token = await loginByEmail(TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send(validRegisterPayload);

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: 'You do not have permission to perform this action.',
      }),
    );
  });

  it('rejects registration with invalid body (validation fails) and returns detailed errors', async () => {
    const token = await loginByPhone(TEST_USERS.SOCIAL_HEALTH_WORKER.phone, TEST_USERS.SOCIAL_HEALTH_WORKER.password);

    const invalidPayload = {
      ...validRegisterPayload,
      firstname: '', // invalid: triggers "First name is required"
      // phone: keep 10 chars but include non-digit to trigger regex-only error
      contact: { phone: '078000001a', email: 'not-an-email' },
    };

    const res = await request(app).post('/api/v1/users').set('Authorization', `Bearer ${token}`).send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: 'Validation failed',
        errors: expect.objectContaining({
          firstname: 'First name is required',
          'contact.phone': 'Phone number must contain only numbers',
          'contact.email': 'Invalid email address',
        }),
      }),
    );
  });

  it('rejects registration when unauthenticated (no token)', async () => {
    const res = await request(app).post('/api/v1/users').send(validRegisterPayload);

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
      }),
    );
  });

  it('returns 400 when email already exists', async () => {
    const token = await loginByPhone(TEST_USERS.SOCIAL_HEALTH_WORKER.phone, TEST_USERS.SOCIAL_HEALTH_WORKER.password);

    const duplicateEmailPayload = {
      ...validRegisterPayload,
      contact: {
        phone: '0780000099', // unique phone
        email: TEST_USERS.ADMIN.email, // duplicate email
      },
      nationalIdentificationNumber: '1199990000000099', // unique NIN
    };

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send(duplicateEmailPayload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: 'A user already exists with the provided email',
      }),
    );
  });

  it('returns 400 when phone number already exists', async () => {
    const token = await loginByPhone(TEST_USERS.SOCIAL_HEALTH_WORKER.phone, TEST_USERS.SOCIAL_HEALTH_WORKER.password);

    const duplicatePhonePayload = {
      ...validRegisterPayload,
      contact: {
        phone: TEST_USERS.ADMIN.phone, // duplicate phone
        email: 'unique.email@example.com', // unique email
      },
      nationalIdentificationNumber: '1199990000000088', // unique NIN
    };

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send(duplicatePhonePayload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: 'A user already exists with the provided phone number',
      }),
    );
  });

  it('returns 400 when national identification number already exists', async () => {
    const token = await loginByPhone(TEST_USERS.SOCIAL_HEALTH_WORKER.phone, TEST_USERS.SOCIAL_HEALTH_WORKER.password);

    const duplicateNinPayload = {
      ...validRegisterPayload,
      contact: {
        phone: '0780000022', // unique phone
        email: 'unique2.email@example.com', // unique email
      },
      nationalIdentificationNumber: TEST_USERS.ADMIN.nationalId, // duplicate NIN
    };

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send(duplicateNinPayload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: 'A user already exists with the provided national identification number',
      }),
    );
  });

  it('sets healthWorkerId in clinical profile when SHW exists in same village (ruvumera)', async () => {
    const token = await loginByPhone(TEST_USERS.SOCIAL_HEALTH_WORKER.phone, TEST_USERS.SOCIAL_HEALTH_WORKER.password);

    // Create a Social Health Worker in target village
    const shw = await User.create({
      firstname: 'Village',
      lastname: 'Worker',
      birthdate: new Date('1985-05-05'),
      address: {
        province: 'kigali',
        district: 'gasabo',
        sector: 'kimironko',
        cell: 'kibagabaga',
        village: 'ruvumera',
      },
      contact: {
        phone: '0780000044',
        email: 'shw.ruvumera@example.com',
      },
      nationalIdentificationNumber: '1199990000000044',
      roles: [AccountRole.SOCIAL_HEALTH_WORKER],
    });

    const payload = {
      firstname: 'Alice',
      lastname: 'Patient',
      birthdate: '1993-03-03',
      address: {
        province: 'kigali',
        district: 'gasabo',
        sector: 'kimironko',
        cell: 'kibagabaga',
        village: 'ruvumera', // matches SHW village
      },
      contact: {
        phone: '0780000055',
        email: 'alice.patient@example.com',
      },
      nationalIdentificationNumber: '1199990000000055',
    };

    const regRes = await request(app).post('/api/v1/users').set('Authorization', `Bearer ${token}`).send(payload);

    expect(regRes.status).toBe(201);
    const patientNumber: number = regRes.body.data.patientNumber.patientNumber as number;

    const profile = await ClinicalProfile.findOne({ patientNumber }).lean();
    expect(profile).toBeTruthy();
    expect(profile!.healthWorkerId?.toString()).toBe(shw._id.toString());
  });
});
