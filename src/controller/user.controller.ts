import type { NextFunction, Request, Response } from "express";
import UserNotFoundError from "../Errors/UserNotFoundError.js";
import type { IUserService } from "../service/interface/iuser.service.js";
import type { RegisterUserDTO } from "../dto/user.dto.js";
import ResponseFactory from "./responseFactory.js";
import i18next from "./../i18n.js";
import { ConstantValues } from "../constants/constant.values.js";

export default class UserController {
  private _userService: IUserService;

  constructor(userService: IUserService) {
    this._userService = userService;
  }

  async registerUserWithAccountController(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { user, account, clinicalProfile } =
        await this._userService.registerUserWithAccount(req.body);
      return res.status(201).json({
        status: "success",
        message: "User registered with account successfully",
        data: {
          user,
          account,
          clinicalProfile,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  async registerUserController(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userData: RegisterUserDTO = req.body;
      const patientNumber = await this._userService.registerUser(userData);
      return res.status(201).json({
        status: "success",
        data: {
          patientNumber,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  async findUserByPatientNumberController(req: Request, res: Response) {
    try {
      const { patientNumber } = req.params;
      if (!patientNumber) {
        return res
          .status(400)
          .json({ status: "fail", message: "Patient number is required" });
      }
      const user = await this._userService.findUserByPatientNumber(
        Number(patientNumber),
      );
      if (!user) {
        return res.status(404).json({
          status: "fail",
          message: i18next.t("patient_not_found_with_patient_number", {
            lng: res.req?.language || ConstantValues.DEFAULT_LANGUAGE,
            defaultValue: `Nta murwayi wabonetse ufite nimero y'umurwayi yatanzwe: ${patientNumber}`,
            patient_number: patientNumber,
          }),
        });
      }
      return ResponseFactory.getResponseFactory(res).ok({ data: { user } });
    } catch (error: any) {
      return res.status(500).json({
        status: "error",
        message: error.message || "Internal server error",
      });
    }
  }

  async findUserDetailsByUserIdForAdminController(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({
          status: "fail",
          message: req.t("parameter_required", { parameter: "userId" }),
        });
      }

      const details =
        await this._userService.findUserDetailsByUserIdForAdmin(userId);

      if (!details) {
        throw new UserNotFoundError();
      }

      return res.status(200).json({ status: "success", data: details });
    } catch (error: any) {
      next(error);
    }
  }

  async updateUserPasswordByAdminController(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          status: "fail",
          message: req.t("parameter_required", { parameter: "userId" }),
        });
      }

      await this._userService.updateUserPasswordByAdmin(userId, req.body);

      return res.status(200).json({
        status: "success",
        message: req.t("password_updated_successfully"),
      });
    } catch (error: any) {
      next(error);
    }
  }

  async getAllUsersController(req: Request, res: Response) {
    try {
      const { users, pagination } = await this._userService.getAllUsers(
        req.query as Record<string, string | string[] | undefined>,
      );

      return res.status(200).json({
        status: "success",
        results: users.length,
        pagination,
        data: { users },
      });
    } catch (error: any) {
      return res.status(500).json({
        status: "error",
        message: error.message || "Internal server error",
      });
    }
  }
}
