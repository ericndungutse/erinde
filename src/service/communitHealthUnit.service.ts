import {
  CreateCommunityHealthUnitSchema,
  type CreateCommunityHealthUnitDTO,
  type GetAllCommunityHealthUnitsResult,
} from '../dto/communitHealthUnitDto.js';
import type { ICommunityHealthUnit } from '../domain/communityHealthUnit.js';
import CommunityHealthUnit from '../models/communitHealthUnit.model.js';
import type { PaginationMeta } from '../types/api.types.js';
import { parsePaginationParams } from '../utils/pagination.js';
import type { ICommunitHealthUnitService } from './interface/icommunitHealthUnit.service.js';

function toSingleValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class CommunitHealthUnitService implements ICommunitHealthUnitService {
  async createCommunityHealthUnit(payload: CreateCommunityHealthUnitDTO): Promise<ICommunityHealthUnit> {
    const parsed = CreateCommunityHealthUnitSchema.parse(payload);
    const communityHealthUnit = await CommunityHealthUnit.create(parsed);

    return {
      id: communityHealthUnit._id.toString(),
      name: communityHealthUnit.name,
      socialHealthWorker: communityHealthUnit.socialHealthWorker,
      healthCenter: communityHealthUnit.healthCenter,
      address: communityHealthUnit.address,
    };
  }

  async getAllCommunityHealthUnits(
    query: Record<string, string | string[] | undefined>,
  ): Promise<GetAllCommunityHealthUnitsResult> {
    const { page, limit } = parsePaginationParams(query);
    const rawName = toSingleValue(query.name);
    const name = rawName?.trim();

    const filter =
      name && name.length > 0
        ? {
            name: {
              $regex: escapeRegex(name),
              $options: 'i',
            },
          }
        : {};

    const totalResults = await CommunityHealthUnit.countDocuments(filter).exec();
    const totalPages = Math.max(1, Math.ceil(totalResults / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const results = await CommunityHealthUnit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select({
        name: 1,
        socialHealthWorker: 1,
        healthCenter: 1,
        address: 1,
      })
      .lean()
      .exec();

    const communityHealthUnits: ICommunityHealthUnit[] = results.map((item: any) => ({
      id: item._id.toString(),
      name: item.name,
      socialHealthWorker: item.socialHealthWorker,
      healthCenter: item.healthCenter,
      address: item.address,
    }));

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

    return {
      communityHealthUnits,
      pagination,
    };
  }
}

export default CommunitHealthUnitService;