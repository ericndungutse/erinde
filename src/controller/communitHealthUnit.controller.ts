import type { NextFunction, Request, Response } from 'express';
import type { CreateCommunityHealthUnitDTO } from '../dto/communitHealthUnitDto.js';
import type { ICommunitHealthUnitService } from '../service/interface/icommunitHealthUnit.service.js';
import ResponseFactory from './responseFactory.js';

export default class CommunitHealthUnitController {
  private _communitHealthUnitService: ICommunitHealthUnitService;

  constructor(communitHealthUnitService: ICommunitHealthUnitService) {
    this._communitHealthUnitService = communitHealthUnitService;
  }

  async createCommunityHealthUnit(req: Request, res: Response, next: NextFunction) {
    try {
      const payload: CreateCommunityHealthUnitDTO = req.body;
      const created = await this._communitHealthUnitService.createCommunityHealthUnit(payload);

      return ResponseFactory.getResponseFactory(res).created(
        'communityHealthUnit',
        created,
        'Community health unit created successfully',
      );
    } catch (error) {
      next(error);
    }
  }
}