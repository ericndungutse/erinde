import type { NextFunction, Request, Response } from "express";
import type { IEncounterService } from "../service/interface/iencounter.service.js";
import ResponseFactory from "./responseFactory.js";

export default class EncounterController {
  private _encounterService: IEncounterService;

  constructor(encounterService: IEncounterService) {
    this._encounterService = encounterService;
  }

  /**
   * Create a new encounter by nurse.
   * Expects req.nurseEncounterContext to be populated by resolveNurseEncounterContext middleware.
   */
  async createEncounter(req: Request, res: Response, next: NextFunction) {
    try {
      const context = req.nurseEncounterContext;
      if (!context) {
        return next(new Error("Nurse encounter context not found"));
      }

      const created = await this._encounterService.createEncounterByNurse(
        req.body,
        context.initiatorId,
        context.hospitalId,
      );

      ResponseFactory.getResponseFactory(res).created(
        "encounter",
        created,
        "Encounter created successfully",
      );
    } catch (err: any) {
      next(err);
    }
  }
}
