import { beforeEach, describe, expect, it } from 'vitest';

import { ConstantValues } from '../../constants/constant.values.js';
import i18next from '../../i18n.js';
import User from '../../models/user.model.js';
import { UserRole } from '../../types/roles.types.js';
import { ACCOUNT_SETUP } from '../testDataSetup/account-setup.js';
import { setupTestData } from '../testDataSetup/index.js';
import { NURSE_SETUP } from '../testDataSetup/nurse-setup.js';
import { loginByEmail } from '../utils/auth-helpers.js';
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
    firstname: NURSE_SETUP.NURSE_NYIRANUMA_HEALTH_CENTER!.firstname,
    lastname: NURSE_SETUP.NURSE_NYIRANUMA_HEALTH_CENTER!.lastname,
    email: NURSE_SETUP.NURSE_NYIRANUMA_HEALTH_CENTER!.contact.email!,
    phone: NURSE_SETUP.NURSE_NYIRANUMA_HEALTH_CENTER!.contact.phone,
    nationalId: NURSE_SETUP.NURSE_NYIRANUMA_HEALTH_CENTER!
      .nationalIdentificationNumber,
    role: UserRole.NURSE,
  },
} as const;

beforeEach(async () => {
  await setupTestData();
});

describe('Integration: GET /api/v1/users/:userId', () => {
  it('returns user details with account for a valid userId (ADMIN)', async () => {
    const adminToken = await loginByEmail(TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
    const targetUser = await User.findOne({ 'contact.email': TEST_USERS.NURSE.email }).lean();

    expect(targetUser).toBeTruthy();

    const res = await client(adminToken).get(`/api/v1/users/admin/${targetUser!._id.toString()}`);

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

    const res = await client(adminToken).get(`/api/v1/users/admin/${nonExistingUserId}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        message: i18next.t('user_not_found', { lng: TEST_LANG }),
      }),
    );
  });
});
