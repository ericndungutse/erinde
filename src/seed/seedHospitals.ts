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
  const seedData = JSON.parse(raw);

  // Clear existing hospitals
  await Hospital.deleteMany({});

  // Insert new hospitals
  await Hospital.insertMany(seedData);

  console.log("Hospitals seeded successfully!");
  await mongoose.disconnect();
}

seedHospitals().catch((err) => {
  console.error("Error seeding hospitals:", err);
  process.exit(1);
});
