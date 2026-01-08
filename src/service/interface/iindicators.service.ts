import type { IIndicatorDetails, IIndicatorSummary } from '../../types/indicator.types.js';

export interface IIndicatorService {
  getAllIndicators(): Promise<IIndicatorSummary[]>;

  getIndicatorDetails(id: string): Promise<IIndicatorDetails | null>;
}
