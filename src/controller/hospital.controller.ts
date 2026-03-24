import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import HospitalNotFoundError from "../Errors/HospitalNotFoundError.js";
import type { IHospitalService } from "../service/interface/ihospital.service.js";
import type { IHospital } from "../types/hospital.types.js";

export default class HospitalController {
  private _hospitalService: IHospitalService;

  constructor(hospitalService: IHospitalService) {
    this._hospitalService = hospitalService;
  }

  async getAllHospitals(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitals: IHospital[]= await this._hospitalService.getAllHospitals();
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

  async getHospitalById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id || !mongoose.isValidObjectId(id)) {
        throw new HospitalNotFoundError();
      }

      const hospital = await this._hospitalService.getHospitalById(id);

      if (!hospital) {
        throw new HospitalNotFoundError();
      }

      res.status(200).json({
        status: "success",
        message: "Hospital retrieved successfully",
        data: {
          hospital,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
