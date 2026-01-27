import bcrypt from 'bcrypt';

import Account from '../../models/account.model.js';
import User from '../../models/user.model.js';
import { AccountRole } from '../../types/user.types.js';

type TestUserDefinition = {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  nationalId: string;
  role: AccountRole;
  password: string;
};

export const TEST_USERS = {
  ADMIN: {
    firstname: 'Admin',
    lastname: 'User',
    email: 'admin@example.com',
    phone: '0780000001',
    nationalId: '1199990000000001',
    role: AccountRole.ADMIN,
    password: 'Password123!',
  },
  NURSE: {
    firstname: 'Nurse',
    lastname: 'User',
    email: 'nurse@example.com',
    phone: '0780000002',
    nationalId: '1199990000000002',
    role: AccountRole.NURSE,
    password: 'Password123!',
  },
  SCREENING_VOLUNTEER: {
    firstname: 'Screening',
    lastname: 'Volunteer',
    email: 'volunteer@example.com',
    phone: '0780000003',
    nationalId: '1199990000000003',
    role: AccountRole.SCREENING_VOLUNTEER,
    password: 'Password123!',
  },
  SOCIAL_HEALTH_WORKER: {
    firstname: 'Social',
    lastname: 'HealthWorker',
    email: 'shw@example.com',
    phone: '0780000004',
    nationalId: '1199990000000004',
    role: AccountRole.SOCIAL_HEALTH_WORKER,
    password: 'Password123!',
  },
} satisfies Record<'ADMIN' | 'NURSE' | 'SCREENING_VOLUNTEER' | 'SOCIAL_HEALTH_WORKER', TestUserDefinition>;

export async function seedAuthTestUsers(): Promise<void> {
  const birthdate = new Date('1990-01-01');

  for (const def of Object.values(TEST_USERS)) {
    const { firstname, lastname, email, phone, nationalId, role, password } = def;

    const user = await User.findOneAndUpdate(
      { 'contact.email': email },
      {
        $set: {
          firstname,
          lastname,
          birthdate,
          address: {
            province: 'kigali',
            district: 'gasabo',
            sector: 'kimironko',
            cell: 'kibagabaga',
            village: 'nyarutarama',
          },
          contact: {
            phone,
            email,
          },
          nationalIdentificationNumber: nationalId,
          roles: [role],
        },
      },
      { upsert: true, new: true },
    ).exec();

    const hashed = await bcrypt.hash(password, 10);

    await Account.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          password: hashed,
          phoneNumber: phone,
          userId: user!._id,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    ).exec();
  }
}
