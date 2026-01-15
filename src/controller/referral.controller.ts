import type { Request, Response } from 'express';
import type { IReferralService } from '../service/interface/ireferral.service.js';

export default class ReferralController {
  private _referralService: IReferralService;

  constructor(referralService: IReferralService) {
    this._referralService = referralService;
  }

  /**
   * List referrals scoped to the logged-in social health worker.
   * Uses ClinicalProfile.healthWorkerId to determine assignment.
   */
  async listMyReferrals(req: Request, res: Response) {
    try {
      const loggedInUserId = req.user?.id;
      if (!loggedInUserId) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized: missing user context' });
      }

      const referrals = await this._referralService.listReferralsByHealthWorker(loggedInUserId, 'PENDING');
      return res.status(200).json({ status: 'success', data: { referrals } });
    } catch (error: any) {
      return res.status(500).json({ status: 'error', message: error?.message || 'Failed to list referrals' });
    }
  }

  /**
   * Get single referral details by id (no population).
   */
  async getReferralById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ status: 'fail', message: 'Referral id is required' });
      }

      const referral = await this._referralService.getReferralById(id);
      if (!referral) {
        return res.status(404).json({ status: 'fail', message: 'Referral not found' });
      }

      return res.status(200).json({ status: 'success', data: { referral } });
    } catch (error: any) {
      return res.status(500).json({ status: 'error', message: error?.message || 'Failed to fetch referral' });
    }
  }
}
