import type {
  CreateEncounterDTO,
  EncounterCreatedResponseDTO,
} from "../../dto/encounter.dto.js";

export interface IEncounterService {
  /**
   * Create a new encounter by nurse.
   * - Existing patient flow: patientNumber (+ optional referralId), urgency
   * - New patient flow: registerUserDto, urgency
   */
  createEncounterByNurse(
    dto: CreateEncounterDTO,
    initiatorId: string,
    hospitalId: string,
  ): Promise<EncounterCreatedResponseDTO>;
}
