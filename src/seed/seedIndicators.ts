import fs from 'fs';
import mongoose from 'mongoose';
import Indicator from '../models/indicator.model.js';

async function seedIndicators() {
  const MONGO_URI: string | undefined = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  await mongoose.connect(MONGO_URI);

  const raw = fs.readFileSync('./src/seed/indicators.json', 'utf8');
  const seedData = JSON.parse(raw);

  console.log(seedData);

  // Optional: Clear existing indicators
  await Indicator.deleteMany({});

  // Insert new indicators
  await Indicator.insertMany(seedData);

  console.log('Indicators seeded successfully!');
  await mongoose.disconnect();
}

seedIndicators().catch((err) => {
  console.error('Error seeding indicators:', err);
  process.exit(1);
});
