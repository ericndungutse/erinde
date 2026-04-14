import mongoose from "mongoose";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type AccountReadFixture = {
  _id: string;
  email?: string;
  password: string;
  phoneNumber: string;
  userId: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadAccountsFixture() {
  const filePath = resolve(
    __dirname,
    "..",
    "reads",
    "erinde_dev.accounts.json",
  );
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as AccountReadFixture[];
}

/**
 * Seed accounts from fixtures/reads/erinde_dev.accounts.json.
 * Note: Passwords are expected to be pre-hashed in the fixture.
 */
export async function setupAccountsFromReads(): Promise<void> {
  const fixtures = loadAccountsFixture();

  const cleanAccounts = fixtures.map((a: AccountReadFixture) => ({
    ...a,
    _id: new mongoose.Types.ObjectId(a._id),
    userId: new mongoose.Types.ObjectId(a.userId),
  }));

  if (mongoose.connection.db) {
    await mongoose.connection.db
      .collection("accounts")
      .insertMany(cleanAccounts);
  }
}
