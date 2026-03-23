import fs from "fs";
import mongoose from "mongoose";
import Hospital from "../models/hospital.model.js";

async function seedHospitals() {
  const MONGO_URI: string | undefined = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not set");
  }

  await mongoose.connect(MONGO_URI);

  const raw = fs.readFileSync("./src/seed/hospitals.json", "utf8");
  const seedData = JSON.parse(raw) as Array<{ name?: string; [key: string]: any }>;

  const normalizedSeedNames = seedData
    .map((hospital) => hospital.name?.trim().toLowerCase())
    .filter((name): name is string => Boolean(name));

  const existingHospitals = await Hospital.find(
    {
      name: { $in: normalizedSeedNames },
    },
    { name: 1 },
  ).lean();

  const existingNames = new Set(
    existingHospitals.map((hospital) => hospital.name?.trim().toLowerCase()).filter(Boolean),
  );

  const hospitalsToInsert = seedData.filter((hospital) => {
    const normalizedName = hospital.name?.trim().toLowerCase();
    if (!normalizedName) {
      return false;
    }
    return !existingNames.has(normalizedName);
  });

  if (hospitalsToInsert.length > 0) {
    await Hospital.insertMany(hospitalsToInsert);
  }

  console.log(
    `Hospitals seeding completed. Inserted: ${hospitalsToInsert.length}, skipped existing: ${seedData.length - hospitalsToInsert.length}`,
  );
  await mongoose.disconnect();
}

seedHospitals().catch((err) => {
  console.error("Error seeding hospitals:", err);
  process.exit(1);
});
