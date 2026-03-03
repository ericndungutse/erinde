import { describe, it, expect, beforeEach } from 'vitest';

import { setupTestDB } from '../utils/mongo-memory.js';
import { client, TEST_LANG } from '../utils/request-factory.js';
import { seedAuthTestUsers, TEST_USERS } from '../utils/seed-auth-users.js';
import i18next from '../../i18n.js';

// Initialize in-memory MongoDB for these tests
setupTestDB();

function expectLoginSuccess(res: any, expectedRole: string) {
  expect(res.status).toBe(200);
  expect(res.body).toEqual(
    expect.objectContaining({
      status: 'success',
      message: i18next.t('login_successful', { lng: TEST_LANG }),
      data: expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          roles: expect.arrayContaining([expectedRole]),
        }),
      }),
    }),
  );
}

beforeEach(async () => {
  await seedAuthTestUsers();
});

describe('Integration: POST /api/v1/auth/login', () => {
  it('logs in ADMIN user by email', async () => {
    const { email, password, role } = TEST_USERS.ADMIN;

    const res = await client().post('/api/v1/auth/login').send({ identifier: email, password });

    expectLoginSuccess(res, role);
  });

  it('logs in NURSE user by phone number', async () => {
    const { phone, password, role } = TEST_USERS.NURSE;

    const res = await client().post('/api/v1/auth/login').send({ identifier: phone, password });

    expectLoginSuccess(res, role);
  });

  it('logs in SCREENING_VOLUNTEER by email', async () => {
    const { email, password, role } = TEST_USERS.SCREENING_VOLUNTEER;

    const res = await client().post('/api/v1/auth/login').send({ identifier: email, password });

    expectLoginSuccess(res, role);
  });

  it('logs in SOCIAL_HEALTH_WORKER by phone number', async () => {
    const { phone, password, role } = TEST_USERS.SOCIAL_HEALTH_WORKER;

    const res = await client().post('/api/v1/auth/login').send({ identifier: phone, password });

    expectLoginSuccess(res, role);
  });

  it('returns 401 and error body for invalid credentials', async () => {
    const res = await client()
      .post('/api/v1/auth/login')
      .send({ identifier: 'unknown@example.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: i18next.t('invalid_credentials', { lng: TEST_LANG }),
      }),
    );
  });

  it('returns 400 and validation errors when payload is invalid', async () => {
    const res = await client().post('/api/v1/auth/login').send({ identifier: '', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toBeDefined();
  });
});
