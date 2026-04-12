import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";
import type { IEncounter, IDiagnosis, IResult } from "../domain/encounter.js";

export type IEncounterDocument = HydratedDocument<IEncounter>;
export interface IEncounterModel extends Model<IEncounter> {}

const resultSchema = new Schema<IResult>(
  {
    status: {
      type: String,
      enum: ["positive", "negative"],
      required: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const diagnosisSchema = new Schema<IDiagnosis>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    results: {
      type: [resultSchema],
      default: [],
    },
  },
  { _id: false },
);

const encounterSchema = new Schema<IEncounter>(
  {
    initiator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    state: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      required: true,
      index: true,
    },

    closeNote: {
      type: String,
      default: null,
      trim: true,
    },

    referralId: {
      type: Schema.Types.ObjectId,
      ref: "Referral",
      default: null,
      index: true,
    },

    patientNumber: {
      type: Number,
      required: true,
      index: true,
    },

    openedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },

    closedAt: {
      type: Date,
      default: null,
      index: true,
    },

    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },

    currentStep: {
      type: String,
      enum: ["triage", "consultation", "lab", "finished"],
      default: "triage",
      required: true,
      index: true,
    },

    urgency: {
      type: String,
      enum: ["low", "medium", "high", "emergency"],
      default: "low",
      required: true,
      index: true,
    },

    diagnoses: {
      type: [diagnosisSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Queue-oriented lookup index for active encounters by department and urgency.
encounterSchema.index({
  state: 1,
  hospitalId: 1,
  currentStep: 1,
  urgency: 1,
  openedAt: 1,
});

// One open encounter per patient at a time - enforce via unique partial index.
encounterSchema.index(
  { patientNumber: 1 },
  { unique: true, partialFilterExpression: { state: "open" } },
);

const Encounter = mongoose.model<IEncounter, IEncounterModel>(
  "Encounter",
  encounterSchema,
);

export default Encounter;
