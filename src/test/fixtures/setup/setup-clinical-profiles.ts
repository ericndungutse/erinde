import mongoose from "mongoose";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type ClinicalProfileReadFixture = {
  _id: string;
  userId: string;
  patientNumber: number;
  createdAt: string;
  updatedAt: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadClinicalProfilesFixture(): ClinicalProfileReadFixture[] {
  const filePath = resolve(
    __dirname,
    "..",
    "reads",
    "erinde_dev.clinicalprofiles.json",
  );
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ClinicalProfileReadFixture[];
}

/**
 * Seed clinical profiles from fixtures/reads/erinde_dev.clinicalprofiles.json.
 */
export async function setupClinicalProfilesFromReads(): Promise<void> {
  const fixtures = loadClinicalProfilesFixture();

  const cleanProfiles = fixtures.map((cp: ClinicalProfileReadFixture) => ({
    ...cp,
    _id: new mongoose.Types.ObjectId(cp._id),
    userId: new mongoose.Types.ObjectId(cp.userId),
    createdAt: new Date(cp.createdAt),
    updatedAt: new Date(cp.updatedAt),
  }));

  if (mongoose.connection.db) {
    await mongoose.connection.db
      .collection("clinicalprofiles")
      .insertMany(cleanProfiles);
  }
}
