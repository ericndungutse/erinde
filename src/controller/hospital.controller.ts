import type { NextFunction, Request, Response } from "express";
import type { IHospitalService } from "../service/interface/ihospital.service.js";

export default class HospitalController {
  private _hospitalService: IHospitalService;

  constructor(hospitalService: IHospitalService) {
    this._hospitalService = hospitalService;
  }

  async getAllHospitals(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitals = await this._hospitalService.getAllHospitals();
      res.status(200).json({
        status: "success",
        message: "Hospitals retrieved successfully",
        data: {
          hospitals,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
