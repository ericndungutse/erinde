import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import app from '../../app.js';
import { loginByPhone } from '../utils/auth-helpers.js';
import { setupTestDB } from '../utils/mongo-memory.js';
import { seedAuthTestUsers, TEST_USERS } from '../utils/seed-auth-users.js';

// Initialize in-memory MongoDB for these tests
setupTestDB();

const validRegisterPayload = {
  firstname: 'Jane',
  lastname: 'Doe',
  birthdate: '1992-02-02',
  address: {
    province: 'kigali',
    district: 'gasabo',
    sector: 'kimironko',
    cell: 'kibagabaga',
    village: 'nyarutarama',
  },
  contact: {
    phone: '0780000030',
    email: 'jane.doe@example.com',
  },
  nationalIdentificationNumber: '1199990000000030',
};

beforeEach(async () => {
  await seedAuthTestUsers();
});

describe('Integration: GET /api/v1/users/:patientNumber', () => {
  it('returns user details for a valid patient number', async () => {
    const token = await loginByPhone(TEST_USERS.SOCIAL_HEALTH_WORKER.phone, TEST_USERS.SOCIAL_HEALTH_WORKER.password);

    // First register a user to obtain a patient number
    const regRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send(validRegisterPayload);

    expect(regRes.status).toBe(201);
    const patientNumber: number = regRes.body.data.patientNumber.patientNumber as number;
    expect(typeof patientNumber).toBe('number');

    // Fetch user by patient number
    const res = await request(app).get(`/api/v1/users/${patientNumber}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          nationalIdentificationNumber: validRegisterPayload.nationalIdentificationNumber,
          firstname: validRegisterPayload.firstname,
          lastname: validRegisterPayload.lastname,
          phone: validRegisterPayload.contact.phone,
        }),
      }),
    );
  });

  it('returns 404 when patient number is not found', async () => {
    const res = await request(app).get('/api/v1/users/999999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: 'User not found',
      }),
    );
  });

  it('returns 500 when patient number is not a valid number (casting error)', async () => {
    const res = await request(app).get('/api/v1/users/abc');
    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'error',
      }),
    );
  });

  // moved: healthWorkerId linkage assertion now covered in user.register.test.ts
});
