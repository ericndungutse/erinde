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
   * List upcoming referrals (today and future) scoped to the logged-in
   * social health worker, ordered by scheduledVisitDate.
   */
  async listMyUpcomingReferrals(req: Request, res: Response) {
    try {
      const loggedInUserId = req.user?.id;
      if (!loggedInUserId) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized: missing user context' });
      }

      const referrals = await this._referralService.listUpcomingReferralsByHealthWorker(loggedInUserId);
      return res.status(200).json({ status: 'success', data: { referrals } });
    } catch (error: any) {
      return res.status(500).json({ status: 'error', message: error?.message || 'Failed to list upcoming referrals' });
    }
  }

  /**
   * Get a count of pending referrals for the logged-in social health worker.
   */
  async countMyPendingReferrals(req: Request, res: Response) {
    try {
      const loggedInUserId = req.user?.id;
      if (!loggedInUserId) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized: missing user context' });
      }

      const count = await this._referralService.countPendingReferralsByHealthWorker(loggedInUserId);
      return res.status(200).json({ status: 'success', data: { count } });
    } catch (error: any) {
      return res
        .status(500)
        .json({ status: 'error', message: error?.message || 'Failed to get pending referrals count' });
    }
  }

  /**
   * Get referral status overview (pending, completed this month, overdue)
   * for the logged-in social health worker.
   */
  async getMyReferralStatusOverview(req: Request, res: Response) {
    try {
      const loggedInUserId = req.user?.id;
      if (!loggedInUserId) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized: missing user context' });
      }

      const summary = await this._referralService.getReferralStatusOverviewByHealthWorker(loggedInUserId);

      return res.status(200).json({
        status: 'success',
        message: 'Referral status overview retrieved successfully',
        data: { summary },
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        message: error?.message || 'Failed to get referral status overview',
      });
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

  /**
   * Complete referral by patient number and return populated patient.
   */
  async completeReferralByPatientNumber(req: Request, res: Response) {
    try {
      const patientNumberParam = req.params.patientNumber;
      const patientNumber = Number(patientNumberParam);

      if (!patientNumber || Number.isNaN(patientNumber)) {
        return res.status(400).json({ status: 'fail', message: 'Valid patientNumber is required (param or body)' });
      }

      const updated = await this._referralService.completeReferralByPatientNumber(patientNumber);
      if (!updated) {
        return res.status(404).json({ status: 'fail', message: 'No pending referral found for given patient number' });
      }

      return res.status(200).json({ status: 'success', data: { referral: updated } });
    } catch (error: any) {
      return res.status(500).json({ status: 'error', message: error?.message || 'Failed to complete referral' });
    }
  }
}
