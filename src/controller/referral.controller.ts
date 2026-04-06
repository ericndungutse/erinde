import type { NextFunction, Request, Response } from "express";
import type { IReferralService } from "../service/interface/ireferral.service.js";
import type { ReferralStatus } from "../types/ReferralStatus.types.js";
import ResponseFactory from "./responseFactory.js";

export default class ReferralController {
  private _referralService: IReferralService;

  constructor(referralService: IReferralService) {
    this._referralService = referralService;
  }

  /**
   * List referrals scoped to the logged-in social health worker.
   * Uses ClinicalProfile.healthWorkerId to determine assignment.
   */
  async getReferrals(req: Request, res: Response) {
    try {
      const rawStatus = Array.isArray(req.query?.status)
        ? req.query.status[0]
        : req.query?.status;

      const allowedStatuses: ReferralStatus[] = [
        "PENDING",
        "COMPLETED",
        "CANCELLED",
      ];
      const status: ReferralStatus =
        typeof rawStatus === "string" && rawStatus.length > 0
          ? (rawStatus.toUpperCase() as ReferralStatus)
          : "PENDING";

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          status: "fail",
          message:
            "Invalid status. Allowed values: PENDING, COMPLETED, CANCELLED",
        });
      }

      const { referrals, pagination } =
        await this._referralService.getAllReferrals(
          req.query
            ? (req.query as Record<string, string | string[] | undefined>)
            : {},
          req.referralFilter || {},
        );

      return res
        .status(200)
        .json({ status: "success", data: { referrals, pagination } });
    } catch (error: any) {
      return res.status(500).json({
        status: "error",
        message: error?.message || "Failed to list referrals",
      });
    }
  }

  /**
   * List upcoming referrals (today and future) scoped to the logged-in
   * social health worker, ordered by scheduledVisitDate.
   */
  async getUpcomingReferralsIn48(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.referralFilter) {
        return next(new Error("ReferralFilter not present."));
      }

      const referrals =
        await this._referralService.getCommingReferralVisitsIn48h(
          req.referralFilter,
        );

      return res.status(200).json({ status: "success", data: { referrals } });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get a count of pending referrals for the logged-in social health worker.
   */
  async getReferralMetrics(req: Request, res: Response) {
    try {
      const metrics = await this._referralService.getReferralMetrics(
        req.referralFilter || {},
      );

      return ResponseFactory.getResponseFactory(res).ok({
        key: "metrics",
        data: metrics,
        message: "Referral metrics retrieved successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        status: "error",
        message: error?.message || "Failed to get referral metrics",
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
        return res
          .status(400)
          .json({ status: "fail", message: "Referral id is required" });
      }

      const referral = await this._referralService.getReferralById(id);
      if (!referral) {
        return res
          .status(404)
          .json({ status: "fail", message: "Referral not found" });
      }

      const loggedInHospitalId = req.user?.hospitalId;
      if (loggedInHospitalId && referral.to !== loggedInHospitalId) {
        return res
          .status(404)
          .json({ status: "fail", message: "Referral not found" });
      }

      return res.status(200).json({ status: "success", data: { referral } });
    } catch (error: any) {
      return res.status(500).json({
        status: "error",
        message: error?.message || "Failed to fetch referral",
      });
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
        return res.status(400).json({
          status: "fail",
          message: "Valid patientNumber is required (param or body)",
        });
      }

      const updated =
        await this._referralService.completeReferralByPatientNumber(
          patientNumber,
        );
      if (!updated) {
        return res.status(404).json({
          status: "fail",
          message: "No pending referral found for given patient number",
        });
      }

      return res
        .status(200)
        .json({ status: "success", data: { referral: updated } });
    } catch (error: any) {
      return res.status(500).json({
        status: "error",
        message: error?.message || "Failed to complete referral",
      });
    }
  }
}
