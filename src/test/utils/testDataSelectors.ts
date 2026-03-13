import type { RegisterUserDTO } from "../../dto/user.dto.js";
import { getTestPatients } from "./readPatients.js";

export function selectPatientByVillage(
  healthWorkerVillage: string,
): RegisterUserDTO | undefined {
  const patients: Record<string, RegisterUserDTO> = getTestPatients();
  const patient: RegisterUserDTO | undefined = Object.values(patients).filter(
    (patient: any) => patient.address.village === healthWorkerVillage,
  )[0];

  return patient;
}
