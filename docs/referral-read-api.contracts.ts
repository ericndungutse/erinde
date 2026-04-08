/**
 * Referral read API response contracts for frontend integration.
 *
 * Source of truth (as implemented):
 * - GET /api/v1/referrals
 * - GET /api/v1/referrals/upcoming
 * - GET /api/v1/referrals/metrics
 * - GET /api/v1/nurse/referrals/:id
 */

export type ISODateString = string;

export type ApiSuccessStatus = "success";
export type ApiFailStatus = "fail";
export type ApiErrorStatus = "error";

export interface ValidationErrorItem {
  field: string;
  message: string;
}

export interface SuccessEnvelope<TData> {
  status: ApiSuccessStatus;
  message?: string;
  data: TData;
}

export interface FailEnvelope {
  status: ApiFailStatus;
  message: string;
  errors?: ValidationErrorItem[];
}

export interface ErrorEnvelope {
  status: ApiErrorStatus;
  message: string;
}

export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  totalResults: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export type ReferralStatus = "PENDING" | "COMPLETED" | "CANCELLED";
export type ReferralFromType = "Hospital" | "CommunityHealthUnit";

/**
 * Returned by GET /api/v1/referrals.
 *
 * Note: list endpoint currently returns `_id` (not `id`) because it uses
 * a lean query without DTO mapping.
 */
export interface ReferralListItem {
  _id: string;
  userId: string;
  patientNumber: number;
  referralDate: ISODateString;
  to: string;
  visitDate?: ISODateString;
  scheduledVisitDate: ISODateString;
  status: ReferralStatus;
  assessments: string[];
  referredBy: string;
  from: string;
  fromType: ReferralFromType;
}

/** Returned by GET /api/v1/referrals/upcoming. */
export interface UpcomingReferralItem {
  id: string;
  patientNumber: number;
  referralDate: ISODateString;
  scheduledVisitDate: ISODateString;
  status: ReferralStatus;
  assessmentCount: number;
}

/** Returned by GET /api/v1/nurse/referrals/:id. */
export interface ReferralDetailsItem {
  id: string;
  userId: string;
  patientNumber: number;
  to: string;
  referralDate: ISODateString;
  scheduledVisitDate: ISODateString;
  status: ReferralStatus;
  assessments: string[];
  referredBy: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  visitDate?: ISODateString;
}

/** Returned by GET /api/v1/referrals/metrics. */
export interface ReferralMetrics {
  total: number;
  pending: number;
  scheduled_today: number;
  completed_today: number;
  overdue: number;
}

// Query shapes (request side) for read operations
export interface GetReferralsQuery {
  status?: ReferralStatus;
  page?: string;
  limit?: string;
  sort?: string;
  fields?: string;
}

// Endpoint-specific success responses
export type GetReferralsSuccessResponse = SuccessEnvelope<{
  referrals: ReferralListItem[];
  pagination: PaginationMeta;
}>;

export type GetUpcomingReferralsSuccessResponse = SuccessEnvelope<{
  referrals: UpcomingReferralItem[];
}>;

export type GetReferralMetricsSuccessResponse = SuccessEnvelope<{
  metrics: ReferralMetrics;
}>;

export type GetReferralByIdForNurseSuccessResponse = SuccessEnvelope<{
  referral: ReferralDetailsItem;
}>;

// Endpoint-specific error unions
export type GetReferralsErrorResponse = FailEnvelope | ErrorEnvelope;
export type GetUpcomingReferralsErrorResponse = ErrorEnvelope;
export type GetReferralMetricsErrorResponse = ErrorEnvelope;
export type GetReferralByIdForNurseErrorResponse = FailEnvelope | ErrorEnvelope;

// Combined response unions
export type GetReferralsResponse =
  | GetReferralsSuccessResponse
  | GetReferralsErrorResponse;

export type GetUpcomingReferralsResponse =
  | GetUpcomingReferralsSuccessResponse
  | GetUpcomingReferralsErrorResponse;

export type GetReferralMetricsResponse =
  | GetReferralMetricsSuccessResponse
  | GetReferralMetricsErrorResponse;

export type GetReferralByIdForNurseResponse =
  | GetReferralByIdForNurseSuccessResponse
  | GetReferralByIdForNurseErrorResponse;
