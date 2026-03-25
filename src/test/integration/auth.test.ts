import { describe, it, expect, beforeEach } from 'vitest';

import { ConstantValues } from '../../constants/constant.values.js';
import i18next from '../../i18n.js';
import { UserRole } from '../../types/roles.types.js';
import { ACCOUNT_SETUP } from '../testDataSetup/account-setup.js';
import { setupTestData } from '../testDataSetup/index.js';
import { NURSE_SETUP } from '../testDataSetup/nurse-setup.js';
import { client, TEST_LANG } from '../utils/request-factory.js';
import { setupTestDB } from '../utils/mongo-memory.js';

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
  await setupTestData();
});

describe('Integration: POST /api/v1/auth/login', () => {
  it('logs in ADMIN user by email', async () => {
    const { email } = ACCOUNT_SETUP.ADMIN!.contact;

    const res = await client()
      .post('/api/v1/auth/login')
      .send({ identifier: email, password: ConstantValues.DEFAULT_PASSWORD });

    expectLoginSuccess(res, UserRole.ADMIN);
  });

  it('logs in NURSE user by phone number', async () => {
    const { phone } = NURSE_SETUP.NURSE_NYIRANUMA_HEALTH_CENTER!.contact;

    const res = await client()
      .post('/api/v1/auth/login')
      .send({ identifier: phone, password: ConstantValues.DEFAULT_PASSWORD });

    expectLoginSuccess(res, UserRole.NURSE);
  });

  it('logs in NURSE user by email', async () => {
    const { email } = NURSE_SETUP.NURSE_NYIRANUMA_HEALTH_CENTER!.contact;

    const res = await client()
      .post('/api/v1/auth/login')
      .send({ identifier: email, password: ConstantValues.DEFAULT_PASSWORD });

    expectLoginSuccess(res, UserRole.NURSE);
  });

  it('logs in SOCIAL_HEALTH_WORKER by phone number', async () => {
    const { phone } = ACCOUNT_SETUP.SOCIAL_HEALTH_WORKER_NYIRANUMA!.contact;

    const res = await client()
      .post('/api/v1/auth/login')
      .send({ identifier: phone, password: ConstantValues.DEFAULT_PASSWORD });

    expectLoginSuccess(res, UserRole.SOCIAL_HEALTH_WORKER);
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
