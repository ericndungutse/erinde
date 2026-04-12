import mongoose from "mongoose";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type HospitalReadFixture = {
  _id: string;
  name: string;
  type: string;
  address: {
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadHospitalsFixture(): HospitalReadFixture[] {
  const filePath = resolve(
    __dirname,
    "..",
    "reads",
    "erinde_dev.hospitals.json",
  );
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as HospitalReadFixture[];
}

/**
 * Seed hospitals from fixtures/reads/erinde_dev.hospitals.json.
 */
export async function setupHospitalsFromReads(): Promise<void> {
  const fixtures = loadHospitalsFixture();

  const cleanHospitals = fixtures.map((hp: HospitalReadFixture) => ({
    ...hp,
    _id: new mongoose.Types.ObjectId(hp._id),
  }));

  if (mongoose.connection.db) {
    await mongoose.connection.db
      .collection("hospitals")
      .insertMany(cleanHospitals);
  }
}
