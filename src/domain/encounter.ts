import type { Types } from "mongoose";

export type EncounterState = "open" | "closed";

export type EncounterStep = "triage" | "consultation" | "lab" | "finished";

export type EncounterUrgency = "low" | "medium" | "high" | "emergency";

export type ResultStatus = "positive" | "negative";

export interface IResult {
  status: ResultStatus;
  note: string;
}

export interface IDiagnosis {
  code: string;
  description: string;
  isPrimary: boolean;
  results: IResult[];
}

export interface IEncounter {
  id?: Types.ObjectId | string;
  initiator: Types.ObjectId | string;
  state: EncounterState;
  closeNote: string | null;
  referralId?: Types.ObjectId | string | null;
  patientNumber: number;
  openedAt: Date | string;
  closedAt?: Date | string | null;
  hospitalId: Types.ObjectId | string;
  currentStep: EncounterStep;
  urgency: EncounterUrgency;
  diagnoses: IDiagnosis[];
  createdAt: Date;
  updatedAt: Date;
}
