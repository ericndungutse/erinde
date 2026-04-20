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
    message: "urgency_must_be_one_of_low_medium_high_emergency",
  },
);

// DTO: encounter creation when patient already exists in the system.
export const CreateEncounterForExistingPatientSchema = z.object({
  patientNumber: z
    .number({ message: "patient_number_is_required" })
    .int()
    .positive("patient_number_must_be_positive"),
  referralId: z
    .string()
    .min(1, { message: "field_cannot_be_empty" })
    .optional(),
  urgency: EncounterUrgencySchema,
});

// DTO: encounter creation when patient does not exist yet.
export const CreateEncounterForNewPatientSchema = z.object({
  registerUserDto: RegisterUserSchema.optional(),
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
