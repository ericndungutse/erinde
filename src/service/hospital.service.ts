import Hospital from "../models/hospital.model.js";
import { CreateHospitalSchema, type CreateHospitalDTO, type IHospital } from "../types/hospital.types.js";
import type { PaginationMeta } from "../types/api.types.js";
import type { IHospitalService } from "./interface/ihospital.service.js";
import { APIFeatures } from "../utils/apiFeatures.js";

export class HospitalService implements IHospitalService {
  async getAllHospitals(
    query: Record<string, string | string[] | undefined>,
  ): Promise<{ hospitals: IHospital[]; pagination: PaginationMeta }> {
    const features = new APIFeatures(Hospital.find(), query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // Count documents matching the same filter
    const countFeatures = new APIFeatures(Hospital.find(), query).filter();
    const filteredQuery = countFeatures.query.getFilter() as any;
    const totalResults = await Hospital.countDocuments(filteredQuery).exec();

    const page = features.page ?? 1;
    const limit = features.limit ?? 20;
    const totalPages = Math.max(1, Math.ceil(totalResults / limit));
    const currentPage = Math.min(page, totalPages);

    // Ensure we keep our hospital projection consistent.
    const hospitals = (await features.query
      .select("-__v -createdAt -updatedAt")
      .lean()
      .exec()) as unknown as IHospital[];

    const pagination: PaginationMeta = {
      currentPage,
      perPage: limit,
      totalResults,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
      prevPage: currentPage > 1 ? currentPage - 1 : null,
    };

    return { hospitals, pagination };
  }

  async getHospitalById(id: string): Promise<IHospital | null> {
    return Hospital.findById(id).select("-__v -createdAt -updatedAt").lean();
  }

  async createHospital(payload: CreateHospitalDTO): Promise<IHospital> {
    const parsed = CreateHospitalSchema.parse(payload);

    const created = await Hospital.create(parsed);
    const hospital = await Hospital.findById(created._id)
      .select("-__v -createdAt -updatedAt")
      .lean();

    if (!hospital) {
      throw new Error("failed_to_create_hospital");
    }

    return hospital as IHospital;
  }
}
