import type { IHospital } from "../../types/hospital.types.js";

export interface IHospitalService {
  getAllHospitals(): Promise<IHospital[]>;
}
