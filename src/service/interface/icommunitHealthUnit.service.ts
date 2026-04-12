import type {
  CreateCommunityHealthUnitDTO,
  GetAllCommunityHealthUnitsResult,
} from "../../dto/communitHealthUnitDto.js";
import type { ICommunityHealthUnit } from "../../domain/communityHealthUnit.js";

export interface ICommunitHealthUnitService {
  createCommunityHealthUnit(
    payload: CreateCommunityHealthUnitDTO,
  ): Promise<ICommunityHealthUnit>;
  getAllCommunityHealthUnits(
    query: Record<string, string | string[] | undefined>,
  ): Promise<GetAllCommunityHealthUnitsResult>;
  getCommunityHealthUnitById(id: string): Promise<ICommunityHealthUnit | null>;
}
