import bcrypt from 'bcrypt';
import fs from 'fs';
import mongoose from 'mongoose';
import Account from '../models/account.model.js';
import User from '../models/user.model.js';

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
          },
        },
        { upsert: true, new: true }
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
        { upsert: true, new: true }
      );

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
