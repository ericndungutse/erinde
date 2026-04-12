import z from "zod";
import { RegisterUserSchema } from "./user.dto.js";
import type {
  EncounterState,
  EncounterStep,
  EncounterUrgency,
} from "../domain/encounter.js";

export const EncounterUrgencySchema = z.enum(
  ["low", "medium", "high", "emergency"],
  {
    message: "Please select a valid urgency level",
  },
);

// DTO: encounter creation when patient already exists in the system.
export const CreateEncounterForExistingPatientSchema = z.object({
  patientNumber: z
    .number({ message: "patientNumber is required" })
    .int()
    .positive("patientNumber must be a positive integer"),
  referralId: z
    .string()
    .min(1, { message: "referralId cannot be empty" })
    .optional(),
  urgency: EncounterUrgencySchema,
});

// DTO: encounter creation when patient does not exist yet.
export const CreateEncounterForNewPatientSchema = z.object({
  registerUserDto: RegisterUserSchema,
  urgency: EncounterUrgencySchema,
});

export type CreateEncounterForExistingPatientDTO = z.infer<
  typeof CreateEncounterForExistingPatientSchema
>;
export type CreateEncounterForNewPatientDTO = z.infer<
  typeof CreateEncounterForNewPatientSchema
>;

export type CreateEncounterDTO =
  | CreateEncounterForExistingPatientDTO
  | CreateEncounterForNewPatientDTO;

export interface EncounterCreatedResponseDTO {
  id: string;
  patientNumber: number;
  referralId: string | null;
  state: EncounterState;
  currentStep: EncounterStep;
  urgency: EncounterUrgency;
  openedAt: Date | string;
}

export const CreateEncounterSchema = z.union([
  CreateEncounterForExistingPatientSchema,
  CreateEncounterForNewPatientSchema,
]);
