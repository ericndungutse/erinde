import type { Types } from 'mongoose';
import type { ReferralStatus } from '../types/ReferralStatus.types.js';
import type { ModelNames } from '../constants/constant.values.js';

type ReferralFromType = ModelNames.Hospital | ModelNames.CommunityHealthUnit;

export interface IReferral {
  // Internal system linkage
  userId: Types.ObjectId | string;

  // Domain Linkage
  patientNumber: number;

  // Date on which the referral was created (day precision)
  referralDate: Date | string;

  // Destination hospital
  to: Types.ObjectId | string;

  // Source of referral (hospital, chu or screening campaign)
  from: Types.ObjectId | string;

  // Would help in
  fromType: ReferralFromType;

  // Date when the patient is expected to go to hospital (referralDate + 3 days)
  scheduledVisitDate: Date | string;

  status: ReferralStatus;

  // Assessment document ids (populate when needed)
  assessments: Array<Types.ObjectId | string>;

  // User who recorded the assessment / initiated the referral
  referredBy: Types.ObjectId | string;

  visitDate?: Date | string;

  // Denormilized CHU

  createdAt: Date;
  updatedAt: Date;
}
