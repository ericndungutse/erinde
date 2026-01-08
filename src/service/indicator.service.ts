import Indicator from '../models/indicator.model.js';
import type { IIndicatorService } from './interface/iindicators.service.js';

export class IndicatorService implements IIndicatorService {
  async getAllIndicators() {
    // Project only _id, name, and classifications.label
    const indicators = await Indicator.find(
      {},
      {
        name: 1,
        'classifications.label': 1,
      }
    ).lean();
    // Map to desired output
    return indicators.map((ind: any) => ({
      id: ind._id,
      name: ind.name,
      labels: (ind.classifications || []).map((c: any) => c.label),
    }));
  }

  async getIndicatorDetails(id: string) {
    const indicator = await Indicator.findById(id).lean();
    if (!indicator) {
      return null;
    }

    return {
      id: indicator._id.toString(),
      name: indicator.name,
      readings: indicator.readings,
      classifications: indicator.classifications,
    };
  }
}

export default IndicatorService;
