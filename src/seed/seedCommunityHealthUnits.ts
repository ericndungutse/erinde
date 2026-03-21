import fs from 'fs';
import mongoose from 'mongoose';
import CommunityHealthUnit from '../models/communitHealthUnit.model.js';
import Hospital from '../models/hospital.model.js';
import { HospitalType } from '../types/hospital.types.js';

type SeedCommunityHealthUnit = {
  name: string;
  address: {
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
};

const normalize = (value: string) => value.trim().toLowerCase();

async function resolveHealthCenterId(seedChu: SeedCommunityHealthUnit) {
  const foundByAddress = await Hospital.findOne({
    type: HospitalType.HEALTH_CENTER,
    'address.province': normalize(seedChu.address.province),
    'address.district': normalize(seedChu.address.district),
    'address.sector': normalize(seedChu.address.sector),
    'address.cell': normalize(seedChu.address.cell),
    'address.village': normalize(seedChu.address.village),
  }).select({ _id: 1 });

  if (!foundByAddress?._id) {
    throw new Error(
      `No matching health center found for CHU ${seedChu.name} (${seedChu.address.village}, ${seedChu.address.cell}).`,
    );
  }

  return foundByAddress._id;
}

async function seedCommunityHealthUnits() {
  const MONGO_URI: string | undefined = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  await mongoose.connect(MONGO_URI);

  const raw = fs.readFileSync('./src/seed/communityHealthUnits.json', 'utf8');
  const seedData: SeedCommunityHealthUnit[] = JSON.parse(raw);

  const prepared = await Promise.all(
    seedData.map(async (seedChu) => {
      const healthCenterId = await resolveHealthCenterId(seedChu);

      return {
        name: seedChu.name,
        address: seedChu.address,
        healthCenter: healthCenterId,
      };
    }),
  );

  await CommunityHealthUnit.deleteMany({});
  await CommunityHealthUnit.insertMany(prepared);

  console.log(`Community Health Units seeded successfully (${prepared.length} records).`);
  await mongoose.disconnect();
}

seedCommunityHealthUnits().catch((err) => {
  console.error('Error seeding Community Health Units:', err);
  process.exit(1);
});
