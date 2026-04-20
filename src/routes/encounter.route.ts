import { Router } from "express";
import { container } from "../container.js";
import {
  CreateEncounterForExistingPatientSchema,
  CreateEncounterSchema,
} from "../dto/encounter.dto.js";
import { resolveNurseEncounterContext } from "../middleware/encounter.middleware.js";
import { authorize, protect } from "../security/auth.middleware.js";
import { UserRole } from "../types/roles.types.js";
import { validateBody } from "../validation/validator.js";

const router = Router();

/**
 * POST /encounters
 * Create encounter with either payload shape.
 * Body: { patientNumber, referralId?, urgency } OR { registerUserDto, urgency }
 */
router.post(
  "/",
  protect,
  authorize(UserRole.NURSE),
  validateBody(CreateEncounterForExistingPatientSchema),
  validateBody(CreateEncounterSchema),
  resolveNurseEncounterContext,
  (req, res, next) =>
    container.encounterController.createEncounter(req, res, next),
);

export default router;
