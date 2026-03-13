

import fs from 'fs';
import Indicator from '../../models/indicator.model.js';

export async function seedIndicatorsFromSetup(): Promise<void> {
  const raw = fs.readFileSync('./src/seed/indicators.json', 'utf8');
  const seedData = JSON.parse(raw);

  // Insert new indicators
  await Indicator.insertMany(seedData);

  console.log('Indicators seeded successfully!');
}




