import bcrypt from 'bcrypt';
import fs from 'fs';
import mongoose from 'mongoose';
import Account from '../models/account.model.js';

type SeedAccount = {
  username: string;
  email: string;
  password: string;
  phoneNumber: string;
  isActive?: boolean;
  roles: string[];
};

async function main() {
  const MONGO_URI: string | undefined = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }
  await mongoose.connect(MONGO_URI);

  const raw = fs.readFileSync('./src/seed/accounts.json', 'utf8');
  const accounts: SeedAccount[] = JSON.parse(raw);

  for (const acc of accounts) {
    const { username, email, password, phoneNumber, isActive = true, roles } = acc;
    const hashed = await bcrypt.hash(password, 10);

    await Account.findOneAndUpdate(
      { $or: [{ email }, { username }, { phoneNumber }] },
      {
        $set: {
          username,
          email,
          password: hashed,
          phoneNumber,
          isActive,
          roles,
        },
      },
      { upsert: true, new: true }
    );

    console.log(`Seeded: ${username} <${email}>`);
  }

  await mongoose.disconnect();
}

main()
  .then(() => console.log('Seeding complete'))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
