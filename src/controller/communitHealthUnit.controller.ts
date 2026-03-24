import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import type { CreateCommunityHealthUnitDTO } from '../dto/communitHealthUnitDto.js';
import CommunityHealthUnitNotFoundError from '../Errors/CommunityHealthUnitNotFoundError.js';
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

  async getAllCommunityHealthUnits(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this._communitHealthUnitService.getAllCommunityHealthUnits(
        req.query as Record<string, string | string[] | undefined>,
      );

      return ResponseFactory.getResponseFactory(res).ok({
        message: 'Community health units retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCommunityHealthUnitById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id || !mongoose.isValidObjectId(id)) {
        throw new CommunityHealthUnitNotFoundError();
      }

      const communityHealthUnit = await this._communitHealthUnitService.getCommunityHealthUnitById(id);

      if (!communityHealthUnit) {
        throw new CommunityHealthUnitNotFoundError();
      }

      return ResponseFactory.getResponseFactory(res).ok({
        message: 'Community health unit retrieved successfully',
        data: { communityHealthUnit },
      });
    } catch (error) {
      next(error);
    }
  }
}