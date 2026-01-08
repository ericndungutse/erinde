import type { Request, Response } from 'express';
import type { IIndicatorService } from '../service/interface/iindicators.service.js';
import type { RouteParams } from '../types/global.types.js';

export default class IndicatorController {
  private _indicatorService: IIndicatorService;

  constructor(indicatorService: IIndicatorService) {
    this._indicatorService = indicatorService;
  }
  async getAllIndicators(req: Request, res: Response) {
    try {
      const indicators = await this._indicatorService.getAllIndicators();
      res.status(200).json({
        status: 'success',
        data: {
          indicators,
        },
      });
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch indicators', error: err });
    }
  }

  async getIndicatorDetails(req: Request<RouteParams>, res: Response) {
    try {
      const indicator = await this._indicatorService.getIndicatorDetails(req.params.id);
      if (!indicator) {
        return res.status(404).json({ message: 'Indicator not found' });
      }
      res.status(200).json({
        status: 'success',
        data: {
          indicator,
        },
      });
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch indicator details', error: err });
    }
  }
}
