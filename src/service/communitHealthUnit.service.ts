import {
  CreateCommunityHealthUnitSchema,
  type CreateCommunityHealthUnitDTO,
} from '../dto/communitHealthUnitDto.js';
import type { ICommunityHealthUnit } from '../domain/communityHealthUnit.js';
import CommunityHealthUnit from '../models/communitHealthUnit.model.js';
import type { ICommunitHealthUnitService } from './interface/icommunitHealthUnit.service.js';

export class CommunitHealthUnitService implements ICommunitHealthUnitService {
  async createCommunityHealthUnit(payload: CreateCommunityHealthUnitDTO): Promise<ICommunityHealthUnit> {
    const parsed = CreateCommunityHealthUnitSchema.parse(payload);
    const communityHealthUnit = await CommunityHealthUnit.create(parsed);

    return {
      name: communityHealthUnit.name,
      socialHealthWorker: communityHealthUnit.socialHealthWorker,
      healthCenter: communityHealthUnit.healthCenter,
      address: communityHealthUnit.address,
    };
  }
}

export default CommunitHealthUnitService;