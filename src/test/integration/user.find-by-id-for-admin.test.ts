import { beforeEach, describe, expect, it } from 'vitest';

import i18next from '../../i18n.js';
import User from '../../models/user.model.js';
import { loginByEmail } from '../utils/auth-helpers.js';
import { setupTestDB } from '../utils/mongo-memory.js';
import { client, TEST_LANG } from '../utils/request-factory.js';
import { seedAuthTestUsers, TEST_USERS } from '../utils/seed-auth-users.js';

// Initialize in-memory MongoDB for these tests
setupTestDB();

beforeEach(async () => {
  await seedAuthTestUsers();
});

describe('Integration: GET /api/v1/users/:userId', () => {
  it('returns user details with account for a valid userId (ADMIN)', async () => {
    const adminToken = await loginByEmail(TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
    const targetUser = await User.findOne({ 'contact.email': TEST_USERS.NURSE.email }).lean();

    expect(targetUser).toBeTruthy();

    const res = await client(adminToken).get(`/api/v1/users/${targetUser!._id.toString()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          user: expect.objectContaining({
            firstname: TEST_USERS.NURSE.firstname,
            lastname: TEST_USERS.NURSE.lastname,
            contact: expect.objectContaining({
              phone: TEST_USERS.NURSE.phone,
              email: TEST_USERS.NURSE.email,
            }),
            roles: expect.arrayContaining([TEST_USERS.NURSE.role]),
            nationalIdentificationNumber: TEST_USERS.NURSE.nationalId,
          }),
          account: expect.objectContaining({
            email: TEST_USERS.NURSE.email,
            phoneNumber: TEST_USERS.NURSE.phone,
            isActive: true,
          }),
        }),
      }),
    );
  });

  it('returns 404 when userId is not found (ADMIN)', async () => {
    const adminToken = await loginByEmail(TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
    const nonExistingUserId = '507f1f77bcf86cd799439011';

    const res = await client(adminToken).get(`/api/v1/users/${nonExistingUserId}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: i18next.t('user_not_found', { lng: TEST_LANG }),
      }),
    );
  });
});
