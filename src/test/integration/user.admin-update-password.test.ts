import { beforeEach, describe, expect, it } from 'vitest';

import { ConstantValues } from '../../constants/constant.values.js';
import i18next from '../../i18n.js';
import User from '../../models/user.model.js';
import { UserRole } from '../../types/roles.types.js';
import { ACCOUNT_SETUP } from '../testDataSetup/account-setup.js';
import { setupTestData } from '../testDataSetup/index.js';
import { NURSE_SETUP } from '../testDataSetup/nurse-setup.js';
import { loginByEmail, loginByPhone } from '../utils/auth-helpers.js';
import { setupTestDB } from '../utils/mongo-memory.js';
import { client, TEST_LANG } from '../utils/request-factory.js';

// Initialize in-memory MongoDB for these tests
setupTestDB();

const TEST_USERS = {
  ADMIN: {
    email: ACCOUNT_SETUP.ADMIN!.contact.email!,
    password: ConstantValues.DEFAULT_PASSWORD,
  },
  NURSE: {
    email: NURSE_SETUP.NURSE_NYIRANUMA_HEALTH_CENTER!.contact.email!,
    role: UserRole.NURSE,
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

describe('Integration: PATCH /api/v1/users/admin/:userId/update-password', () => {
  it('updates user password successfully (ADMIN) and new password works for login', async () => {
    const adminToken = await loginByEmail(TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
    const targetUser = await User.findOne({ 'contact.email': TEST_USERS.NURSE.email }).lean();

    expect(targetUser).toBeTruthy();

    const newPassword = 'NewPassword123!';

    const res = await client(adminToken)
      .patch(`/api/v1/users/admin/${targetUser!._id.toString()}/update-password`)
      .send({ password: newPassword });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'success',
        message: i18next.t('password_updated_successfully', { lng: TEST_LANG }),
      }),
    );

    const loginWithNewPassword = await client().post('/api/v1/auth/login').send({
      identifier: TEST_USERS.NURSE.email,
      password: newPassword,
    });

    expect(loginWithNewPassword.status).toBe(200);
    expect(loginWithNewPassword.body).toEqual(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          token: expect.any(String),
          user: expect.objectContaining({
            roles: expect.arrayContaining([TEST_USERS.NURSE.role]),
          }),
        }),
      }),
    );

    const loginWithOldPassword = await client().post('/api/v1/auth/login').send({
      identifier: TEST_USERS.NURSE.email,
      password: TEST_USERS.NURSE.password,
    });

    expect(loginWithOldPassword.status).toBe(401);
  });

  it('rejects when unauthenticated (no token)', async () => {
    const targetUser = await User.findOne({ 'contact.email': TEST_USERS.NURSE.email }).lean();

    expect(targetUser).toBeTruthy();

    const res = await client().patch(`/api/v1/users/admin/${targetUser!._id.toString()}/update-password`).send({
      password: 'NewPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
      }),
    );
  });

  it('rejects when unauthorized (non-ADMIN)', async () => {
    const shwToken = await loginByPhone(
      TEST_USERS.SOCIAL_HEALTH_WORKER.phone,
      TEST_USERS.SOCIAL_HEALTH_WORKER.password,
    );
    const targetUser = await User.findOne({ 'contact.email': TEST_USERS.NURSE.email }).lean();

    expect(targetUser).toBeTruthy();

    const res = await client(shwToken).patch(`/api/v1/users/admin/${targetUser!._id.toString()}/update-password`).send({
      password: 'NewPassword123!',
    });

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: 'You do not have permission to perform this action.',
      }),
    );
  });

  it('returns 400 with validation errors when password is invalid', async () => {
    const adminToken = await loginByEmail(TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
    const targetUser = await User.findOne({ 'contact.email': TEST_USERS.NURSE.email }).lean();

    expect(targetUser).toBeTruthy();

    const res = await client(adminToken)
      .patch(`/api/v1/users/admin/${targetUser!._id.toString()}/update-password`)
      .send({ password: '123' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: 'Validation failed',
        errors: expect.objectContaining({
          password: 'Password must be at least 6 characters long',
        }),
      }),
    );
  });

  it('returns 404 when user is not found', async () => {
    const adminToken = await loginByEmail(TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);

    const res = await client(adminToken).patch('/api/v1/users/admin/507f1f77bcf86cd799439011/update-password').send({
      password: 'NewPassword123!',
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: i18next.t('user_not_found', { lng: TEST_LANG }),
      }),
    );
  });
});
