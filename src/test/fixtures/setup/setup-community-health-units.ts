import mongoose from "mongoose";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CommunityHealthUnitReadFixture = {
  _id: string;
  socialHealthWorker: string;
  healthCenter: string;
  address: {
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  createdAt: string;
  updatedAt: string;
  name: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadCommunityHealthUnitsFixture(): CommunityHealthUnitReadFixture[] {
  const filePath = resolve(
    __dirname,
    "..",
    "reads",
    "erinde_dev.communityhealthunits.json",
  );
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as CommunityHealthUnitReadFixture[];
}

/**
 * Seed community health units from fixtures/reads/erinde_dev.communityhealthunits.json.
 */
export async function setupCommunityHealthUnitsFromReads(): Promise<void> {
  const fixtures = loadCommunityHealthUnitsFixture();

  const cleanUnits = fixtures.map((chu: CommunityHealthUnitReadFixture) => ({
    ...chu,
    _id: new mongoose.Types.ObjectId(chu._id),
    socialHealthWorker: new mongoose.Types.ObjectId(chu.socialHealthWorker),
    healthCenter: new mongoose.Types.ObjectId(chu.healthCenter),
    createdAt: new Date(chu.createdAt),
    updatedAt: new Date(chu.updatedAt),
  }));

  if (mongoose.connection.db) {
    await mongoose.connection.db
      .collection("communityhealthunits")
      .insertMany(cleanUnits);
  }
}
