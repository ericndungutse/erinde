import type { CreateCommunityHealthUnitDTO } from '../../dto/communitHealthUnitDto.js';
import type { ICommunityHealthUnit } from '../../domain/communityHealthUnit.js';

export interface ICommunitHealthUnitService {
  createCommunityHealthUnit(payload: CreateCommunityHealthUnitDTO): Promise<ICommunityHealthUnit>;
}