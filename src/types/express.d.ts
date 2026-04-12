import type { IReferralDocument } from "../models/referral.model.ts";
import type { ILoggedInUser } from "./auth.types.js";
import type { NurseEncounterContext } from "../middleware/encounter.middleware.js";

declare global {
  namespace Express {
    interface Request {
      user?: ILoggedInUser;
      existingPendingReferral?: IReferralDocument | null;
      referralFilter?: Record<string, any>;
      nurseEncounterContext?: NurseEncounterContext;
    }
  }
}
