import Hospital from "../models/hospital.model.js";
import type { IHospital } from "../types/hospital.types.js";
import type { IHospitalService } from "./interface/ihospital.service.js";

export class HospitalService implements IHospitalService {
  async getAllHospitals(): Promise<IHospital[]> {
    return Hospital.find().select("-__v -createdAt -updatedAt").lean();
  }
}
