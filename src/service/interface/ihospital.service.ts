import type { CreateHospitalDTO, IHospital } from "../../types/hospital.types.js";
import type { PaginationMeta } from "../../types/api.types.js";

export interface IHospitalService {
  getAllHospitals(
    query: Record<string, string | string[] | undefined>,
  ): Promise<{ hospitals: IHospital[]; pagination: PaginationMeta }>;
  getHospitalById(id: string): Promise<IHospital | null>;
  createHospital(payload: CreateHospitalDTO): Promise<IHospital>;
}
