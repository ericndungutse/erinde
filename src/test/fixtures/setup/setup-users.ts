import mongoose from "mongoose";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type UserReadFixture = {
  _id: string;
  firstname: string;
  lastname: string;
  birthdate: string;
  address: {
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  contact: {
    phone: string;
    email?: string;
  };
  nationalIdentificationNumber: string;
  roles: string[];
  communityHealthUnit: string;
  hospitalId?: string;
  createdAt: string;
  updatedAt: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadUsersFixture() {
  const filePath = resolve(__dirname, "..", "reads", "erinde_dev.users.json");
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as UserReadFixture[];
}

/**
 * Seed users from fixtures/reads/erinde_dev.users.json.
 * Handles both User and Nurse discriminators based on presence of hospitalId.
 */
export async function setupUsersFromReads(): Promise<void> {
  const fixtures = loadUsersFixture();

  const cleanUsers = fixtures.map((u: UserReadFixture) => ({
    ...u,
    _id: new mongoose.Types.ObjectId(u._id),
    communityHealthUnit: new mongoose.Types.ObjectId(u.communityHealthUnit),
    hospitalId: u.hospitalId
      ? new mongoose.Types.ObjectId(u.hospitalId)
      : undefined,
    birthdate: new Date(u.birthdate),
    createdAt: new Date(u.createdAt),
    updatedAt: new Date(u.updatedAt),
  }));

  if (mongoose.connection.db) {
    await mongoose.connection.db.collection("users").insertMany(cleanUsers);
  }
}
