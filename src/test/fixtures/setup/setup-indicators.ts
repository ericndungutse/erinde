import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import Indicator from "../../../models/indicator.model.js";

type OidRef = {
  $oid: string;
};

type DateRef = {
  $date: string;
};

type IndicatorReadFixture = {
  _id: OidRef;
  name: string;
  readings: Array<{
    type: string;
    unit: string;
  }>;
  classifications: Array<{
    status_code: "healthy" | "warning" | "danger" | "critical";
    label: string;
    min_systolic?: number;
    max_systolic?: number;
    min_diastolic?: number;
    max_diastolic?: number;
    min_value?: number;
    max_value?: number;
    logic?: "OR" | "AND";
    recommendations: string[];
  }>;
  createdAt?: DateRef;
  updatedAt?: DateRef;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadIndicatorsFixture(): IndicatorReadFixture[] {
  const filePath = resolve(
    __dirname,
    "..",
    "reads",
    "erinde_dev.indicators.json",
  );
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as IndicatorReadFixture[];
}

/**
 * Seed indicators from fixtures/reads/erinde_dev.indicators.json.
 */
export async function setupIndicatorsFromReads(): Promise<void> {
  const fixtures = loadIndicatorsFixture();

  const cleanIndicators = fixtures.map((ind: IndicatorReadFixture) => ({
    ...ind,
    _id: new mongoose.Types.ObjectId(ind._id.$oid),
    createdAt: ind.createdAt ? new Date(ind.createdAt.$date) : undefined,
    updatedAt: ind.updatedAt ? new Date(ind.updatedAt.$date) : undefined,
  }));

  if (mongoose.connection.db) {
    await mongoose.connection.db
      .collection("indicators")
      .insertMany(cleanIndicators);
  }
}
