import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import HospitalNotFoundError from "../Errors/HospitalNotFoundError.js";
import type { IHospitalService } from "../service/interface/ihospital.service.js";
import type { CreateHospitalDTO, IHospital } from "../types/hospital.types.js";
import ResponseFactory from "./responseFactory.js";

export default class HospitalController {
  private _hospitalService: IHospitalService;

  constructor(hospitalService: IHospitalService) {
    this._hospitalService = hospitalService;
  }

  async getAllHospitals(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this._hospitalService.getAllHospitals(
        req.query as Record<string, string | string[] | undefined>,
      );
      res.status(200).json({
        status: "success",
        message: "Hospitals retrieved successfully",
        data: {
          hospitals: result.hospitals,
          pagination: result.pagination,
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

  async createHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const payload: CreateHospitalDTO = req.body;
      const created = await this._hospitalService.createHospital(payload);

      return ResponseFactory.getResponseFactory(res).created(
        "hospital",
        created,
        "Hospital created successfully",
      );
    } catch (err) {
      next(err);
    }
  }
}
