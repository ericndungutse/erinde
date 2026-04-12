import mongoose from "mongoose";
import type { IEncounter } from "../domain/encounter.js";
import type {
  CreateEncounterDTO,
  CreateEncounterForExistingPatientDTO,
  EncounterCreatedResponseDTO,
} from "../dto/encounter.dto.js";
import PatientNotFoundException from "../Errors/PatientNotFoundException.js";
import ReferralHospitalMismatchError from "../Errors/ReferralHospitalMismatchError.js";
import Encounter from "../models/encounter.model.js";
import Referral from "../models/referral.model.js";
import type { IEncounterService } from "./interface/iencounter.service.js";
import type { IUserService } from "./interface/iuser.service.js";
import { logger } from "../logger.js";

export class EncounterService implements IEncounterService {
  private _userService: IUserService;

  constructor(userService: IUserService) {
    this._userService = userService;
  }

  async createEncounterByNurse(
    dto: CreateEncounterDTO,
    initiatorId: string,
    hospitalId: string,
  ): Promise<EncounterCreatedResponseDTO> {
    logger.info(
      {
        initiatorId,
        hospitalId,
        isExistingPatient: this.isExistingPatientPayload(dto),
      },
      "Starting encounter creation process",
    );

    const patientNumber = await this.resolvePatientNumber(dto);
    logger.debug({ patientNumber }, "Patient number resolved");

    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      logger.debug("Database transaction started");

      const existingOpenEncounter = await Encounter.findOne({
        patientNumber,
        state: "open",
      })
        .session(session)
        .lean()
        .exec();

      if (existingOpenEncounter) {
        logger.warn(
          { patientNumber, existingEncounterId: existingOpenEncounter._id },
          "Attempt to create encounter for patient with existing open encounter",
        );
        throw new Error("An open encounter already exists for this patient");
      }

      logger.debug({ patientNumber }, "No open encounter exists for patient");

      let referralId: string | null = null;

      if (this.isExistingPatientPayload(dto)) {
        const referral = dto.referralId
          ? await Referral.findOne({
              _id: dto.referralId,
              patientNumber,
              status: "PENDING",
            })
              .session(session)
              .exec()
          : await Referral.findOne({
              patientNumber,
              status: "PENDING",
            })
              .sort({ referralDate: -1 })
              .session(session)
              .exec();

        if (dto.referralId && !referral) {
          logger.warn(
            { referralId: dto.referralId, patientNumber },
            "Provided referral ID not found or not in PENDING status",
          );
          throw new Error("Referral not found for the provided patientNumber");
        }

        if (referral) {
          logger.debug(
            { referralId: referral._id, referralStatus: referral.status },
            "Referral found for patient",
          );

          // Validate that the referral's destination hospital matches the nurse's hospital
          const referralToHospitalId = String(referral.to);
          if (referralToHospitalId !== hospitalId) {
            logger.warn(
              {
                patientNumber,
                referralDestinationHospitalId: referralToHospitalId,
                attemptedHospitalId: hospitalId,
              },
              "Hospital mismatch: referral destination does not match nurse's hospital",
            );
            throw new ReferralHospitalMismatchError();
          }

          logger.debug(
            { referralId: referral._id },
            "Referral hospital validation passed",
          );

          referral.status = "IN_PROGRESS" as any;
          await referral.save({ session });
          referralId = referral.id;
          logger.info(
            { referralId: referral._id },
            "Referral status updated to IN_PROGRESS",
          );
        } else {
          logger.debug(
            { patientNumber },
            "No pending referral found for existing patient",
          );
        }
      }

      const payload: IEncounter = {
        initiator: initiatorId,
        state: "open",
        closeNote: null,
        referralId,
        patientNumber,
        openedAt: new Date(),
        hospitalId,
        currentStep: "triage",
        urgency: dto.urgency,
        diagnoses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [created] = await Encounter.create([payload], { session });
      if (!created) {
        logger.error(
          { patientNumber, payload },
          "Failed to create encounter document",
        );
        throw new Error("Encounter creation failed");
      }

      await session.commitTransaction();
      logger.info(
        {
          encounterId: created.id,
          patientNumber: created.patientNumber,
          hospitalId: created.hospitalId,
          referralId: created.referralId ? String(created.referralId) : null,
          urgency: created.urgency,
        },
        "Encounter created successfully",
      );

      return {
        id: created.id,
        patientNumber: created.patientNumber,
        referralId: created.referralId ? String(created.referralId) : null,
        state: created.state,
        currentStep: created.currentStep,
        urgency: created.urgency,
        openedAt: created.openedAt,
      };
    } catch (error) {
      await session.abortTransaction();
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(
        {
          initiatorId,
          hospitalId,
          error: errorMessage,
        },
        "Encounter creation failed - transaction rolled back",
      );
      throw error;
    } finally {
      await session.endSession();
      logger.debug("Database session ended");
    }
  }

  private async resolvePatientNumber(dto: CreateEncounterDTO): Promise<number> {
    if (this.isExistingPatientPayload(dto)) {
      logger.debug(
        { patientNumber: dto.patientNumber },
        "Resolving existing patient",
      );
      const patient = await this._userService.findUserByPatientNumber(
        dto.patientNumber,
      );
      if (!patient) {
        logger.warn(
          { patientNumber: dto.patientNumber },
          "Patient not found for provided patient number",
        );
        throw new PatientNotFoundException();
      }
      logger.debug(
        { patientNumber: dto.patientNumber },
        "Existing patient resolved successfully",
      );
      return dto.patientNumber;
    }

    logger.info("Registering new patient for encounter creation");
    const registered = await this._userService.registerUser(
      dto.registerUserDto,
    );
    logger.info(
      { patientNumber: registered.patientNumber },
      "New patient registered successfully",
    );
    return registered.patientNumber;
  }

  private isExistingPatientPayload(
    dto: CreateEncounterDTO,
  ): dto is CreateEncounterForExistingPatientDTO {
    return "patientNumber" in dto;
  }
}

export default EncounterService;
