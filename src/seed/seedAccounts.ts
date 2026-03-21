import bcrypt from 'bcrypt';
import fs from 'fs';
import mongoose from 'mongoose';
import Account from '../models/account.model.js';
import CommunityHealthUnit from '../models/communitHealthUnit.model.js';
import User from '../models/user.model.js';
import { UserRole } from '../types/roles.types.js';

type SeedUserData = {
  firstname: string;
  lastname: string;
  birthdate: string;
  address: {
    province: string;
    city: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  nationalIdentificationNumber: string;
  roles: string[];
};

type SeedAccountData = {
  password: string;
};

type SeedEntry = {
  user: SeedUserData;
  account: SeedAccountData;
};

const normalize = (value: string) => value.trim().toLowerCase();

async function resolveCommunityHealthUnitId(userData: SeedUserData) {
  const normalizedAddress = {
    province: normalize(userData.address.province),
    district: normalize(userData.address.district),
    sector: normalize(userData.address.sector),
    cell: normalize(userData.address.cell),
    village: normalize(userData.address.village),
  };

  const exactMatch = await CommunityHealthUnit.findOne({
    'address.province': normalizedAddress.province,
    'address.district': normalizedAddress.district,
    'address.sector': normalizedAddress.sector,
    'address.cell': normalizedAddress.cell,
    'address.village': normalizedAddress.village,
  }).select({ _id: 1 });

  if (exactMatch?._id) {
    return exactMatch._id;
  }

  const sameCellMatch = await CommunityHealthUnit.findOne({
    'address.province': normalizedAddress.province,
    'address.district': normalizedAddress.district,
    'address.sector': normalizedAddress.sector,
    'address.cell': normalizedAddress.cell,
  })
    .sort({ 'address.village': 1 })
    .select({ _id: 1, name: 1, address: 1 });

  if (sameCellMatch?._id) {
    console.warn(`CHU exact match not found for ${userData.contact.email}. Falling back to ${sameCellMatch.name}.`);
    return sameCellMatch._id;
  }

  throw new Error(`No Community Health Unit found for ${userData.contact.email}. Seed hospitals and CHUs first.`);
}

async function main() {
  const MONGO_URI: string | undefined = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }
  await mongoose.connect(MONGO_URI);

  const raw = fs.readFileSync('./src/seed/accounts.json', 'utf8');
  const seedData: SeedEntry[] = JSON.parse(raw);

  for (const entry of seedData) {
    const { user: userData, account: accountData } = entry;

    try {
      const communityHealthUnitId = await resolveCommunityHealthUnitId(userData);

      // 1. Upsert the User
      const user = await User.findOneAndUpdate(
        { $or: [{ 'contact.email': userData.contact.email }, { 'contact.phone': userData.contact.phone }] },
        {
          $set: {
            firstname: userData.firstname,
            lastname: userData.lastname,
            birthdate: new Date(userData.birthdate),
            address: userData.address,
            contact: userData.contact,
            nationalIdentificationNumber: userData.nationalIdentificationNumber,
            roles: userData.roles,
            communityHealthUnit: communityHealthUnitId,
          },
        },
        { upsert: true, new: true },
      );

      // 2. Upsert the Account with userId reference
      const hashed = await bcrypt.hash(accountData.password, 10);

      await Account.findOneAndUpdate(
        { $or: [{ email: userData.contact.email }, { phoneNumber: userData.contact.phone }] },
        {
          $set: {
            email: userData.contact.email,
            password: hashed,
            phoneNumber: userData.contact.phone,
            userId: user._id,
            isActive: true,
          },
        },
        { upsert: true, new: true },
      );

      if (userData.roles.includes(UserRole.SOCIAL_HEALTH_WORKER)) {
        await CommunityHealthUnit.updateOne({ _id: communityHealthUnitId }, { $set: { socialHealthWorker: user._id } });
      }

      console.log(`Seeded: ${userData.firstname} ${userData.lastname} <${userData.contact.email}>`);
    } catch (error: any) {
      console.error(`Failed to seed ${userData.firstname} ${userData.lastname}:`, error.message);
    }
  }

  await mongoose.disconnect();
}

main()
  .then(() => console.log('Seeding complete'))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
