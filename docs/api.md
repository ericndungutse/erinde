# ERINDE API v1 — Comprehensive Integration Guide

This document describes the ERINDE backend API for building a full-featured frontend, including authentication, authorization, input validation, data models, and request/response examples. It is designed for both frontend engineers and AI agents (e.g., v0) to integrate and render dynamic UIs.

- Version: v1
- Base URL: `/api/v1`
- Content-Type: `application/json`
- Auth: JWT Bearer (supports `Authorization: Bearer <token>` or cookie `jwt`)

---

## Security

- Scheme: JWT Bearer
- Header: `Authorization: Bearer <jwt>`
- Cookie (optional): `jwt=<jwt>`
- Token payload includes: `accountId`, `email`, `roles: string[]`, standard JWT claims, and `sub` (user id). The server loads the user by `sub`.
- Required env:
  - `JWT_SECRET`: signing key
  - `JWT_EXPIRES_IN`: e.g., `1d`

### Roles

- `ADMIN`
- `SOCIAL_HEALTH_WORKER`
- `SCREENING_VOLUNTEER`
- `NURSE`
- `USER`

Authorization is enforced per route. If the authenticated user has any of the required roles, access is permitted.

### Error Model

- Structure: `{ status: 'fail' | 'error' | 'success', message?: string, data?: any, errors?: Array<{ field: string, message: string }> }`
- Validation errors are returned with `status: 'fail'` and an `errors` array.
- Not found conditions typically return `status: 'fail'` with `404`.

---

## Endpoint Catalog (Cheat Sheet)

All paths are relative to the base URL `/api/v1`.

| Method | Path                                 | Description                                                     | Auth                                          |
| ------ | ------------------------------------ | --------------------------------------------------------------- | --------------------------------------------- |
| GET    | `/health`                            | Health check                                                    | Public                                        |
| POST   | `/auth/login`                        | User login, returns JWT                                         | Public                                        |
| GET    | `/users`                             | List all users                                                  | `ADMIN`                                       |
| POST   | `/users`                             | Register citizen/patient (no account)                           | `SOCIAL_HEALTH_WORKER`, `SCREENING_VOLUNTEER` |
| POST   | `/users/admin/register`              | Admin registers user + account                                  | `ADMIN`                                       |
| GET    | `/users/:patientNumber`              | Lookup patient minimal info by patient number                   | Public                                        |
| GET    | `/indicators`                        | List indicators (id, name, labels)                              | Public                                        |
| GET    | `/indicators/:id`                    | Get full indicator definition                                   | Public                                        |
| POST   | `/assessments`                       | Create assessment, may auto-create referral                     | Any authenticated                             |
| GET    | `/assessments/:id`                   | Get assessment details                                          | Any authenticated                             |
| GET    | `/assessments/me/last-24-hours`      | List last 24h assessments taken by logged-in health worker      | `SOCIAL_HEALTH_WORKER`                        |
| GET    | `/referrals/me`                      | List referrals for patients assigned to logged-in health worker | `SOCIAL_HEALTH_WORKER`                        |
| GET    | `/referrals/upcoming`                | List upcoming referrals (next 48h) for logged-in health worker  | `SOCIAL_HEALTH_WORKER`                        |
| GET    | `/referrals/pending/count`           | Get count of pending referrals for logged-in health worker      | `SOCIAL_HEALTH_WORKER`                        |
| GET    | `/referrals/status/overview`         | Get referral status overview for logged-in health worker        | `SOCIAL_HEALTH_WORKER`                        |
| GET    | `/referrals/:id`                     | Get referral details                                            | `SOCIAL_HEALTH_WORKER`                        |
| PATCH  | `/referrals/complete/:patientNumber` | Nurse completes latest pending referral by patient number       | `NURSE`                                       |

---

## Health

GET `/health`

- Public liveness check.
- 200 Response:

```json
{ "status": "ok", "message": "API is running" }
```

---

## Authentication

POST `/api/v1/auth/login`

- Body:

```json
{
  "identifier": "string (email or phone)",
  "password": "string (min 6)"
}
```

- Validation: `identifier` required; `password` min 6.
- 200 Response:

```json
{
  "status": "success",
  "message": "Authentication successful",
  "data": {
    "token": "<jwt>",
    "user": { "id": "<userId>", "roles": ["SOCIAL_HEALTH_WORKER", "USER"] },
    "activeRole": null
  }
}
```

- Notes:
  - Include the token in subsequent requests via `Authorization` header or cookie `jwt`.
  - If users have multiple roles, the client can let the user choose an active role for UI.

---

## Users

Base: `/api/v1/users`

### GET `/`

- Purpose: List all users (id, name, roles).
- Auth: Required. Roles: `ADMIN` only.
- Response 200:

```json
{
  "status": "success",
  "data": { "users": [{ "id": "...", "name": "John Doe", "roles": ["USER"] }] }
}
```

### POST `/`

- Purpose: Register a citizen/patient (no account). Assigns role `USER` and creates clinical profile with `patientNumber`. For assignment, links to a `SOCIAL_HEALTH_WORKER` in the same village if present.
- Auth: Required. Roles: `SOCIAL_HEALTH_WORKER` or `SCREENING_VOLUNTEER`.
- Body (validated):

```json
{
  "firstname": "string",
  "lastname": "string",
  "birthdate": "ISO date string",
  "address": {
    "province": "string",
    "district": "string",
    "sector": "string",
    "cell": "string",
    "village": "string"
  },
  "contact": {
    "phone": "+2507...",
    "email": "user@example.com"
  },
  "nationalIdentificationNumber": "16-digit string"
}
```

- Key validation rules:
  - `birthdate` parseable to Date
  - `contact.phone` min 10, numeric with optional `+`
  - `contact.email` valid email
  - `nationalIdentificationNumber` exactly 16 digits
- Responses:
  - 201:

```json
{ "status": "success", "data": { "patientNumber": 12345 } }
```

- 400: duplicate user or validation errors

### POST `/admin/register`

- Purpose: Admin registers a user and immediately creates an account (login credentials). Adds roles: always includes `USER` plus provided roles.
- Auth: Required. Roles: `ADMIN`.
- Body = above Register body + `roles: ["ADMIN"|"SOCIAL_HEALTH_WORKER"|"SCREENING_VOLUNTEER"|"USER", ...]` (min 1)
- 201 Response:

```json
{
  "status": "success",
  "message": "User registered with account successfully",
  "data": {
    "user": {
      /* user doc sans internal fields */
    },
    "account": {
      /* account doc sans password */
    },
    "clinicalProfile": { "patientNumber": 12345 /* ... */ }
  }
}
```

- Notes: Account password is initially set to a default (`ConstantValues.DEFAULT_PASSWORD`) and `mustChangePassword: true`.

### GET `/:patientNumber`

- Purpose: Lookup minimal user info by `patientNumber`.
- Auth: Not required.
- Response 200:

```json
{
  "status": "success",
  "data": {
    "nationalIdentificationNumber": "...",
    "firstname": "...",
    "lastname": "...",
    "phone": "+2507..."
  }
}
```

- 404 if not found.

---

## Indicators

Base: `/api/v1/indicators`

- Public endpoints to drive UI for measurement forms and labeling.

### GET `/`

- Purpose: List all indicators with display labels.
- Auth: Not required.
- 200 Response:

```json
{
  "status": "success",
  "data": {
    "indicators": [
      {
        "id": "<indicatorId>",
        "name": "hypertension|diabetes|bmi",
        "labels": ["Normal", "Stage 1 Hypertension", "..."]
      }
    ]
  }
}
```

### GET `/:id`

- Purpose: Get indicator details to render input controls and interpret results.
- Auth: Not required.
- 200 Response:

```json
{
  "status": "success",
  "data": {
    "indicator": {
      "id": "...",
      "name": "hypertension",
      "readings": [
        { "type": "systolic_blood_pressure", "unit": "mmHg" },
        { "type": "diastolic_blood_pressure", "unit": "mmHg" }
      ],
      "classifications": [
        {
          "status_code": "healthy",
          "label": "Normal",
          "min_systolic": 90,
          "max_systolic": 120,
          "min_diastolic": 60,
          "max_diastolic": 80,
          "logic": "AND",
          "recommendations": ["..."]
        }
      ]
    }
  }
}
```

---

## Assessments

Base: `/api/v1/assessments`

### POST `/`

- Purpose: Submit a clinical assessment for a patient. Classifies results and may auto-create a referral if abnormal.
- Auth: Required (`protect`). Any authenticated role can submit; typically `SOCIAL_HEALTH_WORKER` or `SCREENING_VOLUNTEER`.
- Body (validated):

```json
{
  "patientNumber": 12345,
  "indicator": "<indicatorId>",
  "readings": {
    "systolic_blood_pressure": { "value": 138, "unit": "mmHg" },
    "diastolic_blood_pressure": { "value": 92, "unit": "mmHg" }
  }
}
```

- Validation:
  - `patientNumber` positive integer
  - `indicator` non-empty string (ObjectId)
  - `readings` is a map of `{ value: positive int, unit: non-empty string }`
  - Units are checked against indicator definition; mismatches are rejected
- Responses:
  - 201:

```json
{
  "status": "success",
  "message": "Assessment created successfully",
  "data": {
    "assessment": {
      "id": "...",
      "readings": {
        "systolic_blood_pressure": { "value": 138, "unit": "mmHg" },
        "diastolic_blood_pressure": { "value": 92, "unit": "mmHg" }
      },
      "classification": { "label": "Stage 1 Hypertension", "status_code": "warning" },
      "recommendations": ["Reduce salt intake", "..."]
    }
  }
}
```

- 404: patient or indicator not found
- 400: validation or unit mismatch
- Referral auto-creation:
  - If `classification.status_code !== 'healthy'`, a daily referral is created/updated for the patient.
  - Requires an authenticated user (`evaluatedBy` set from token). If missing, creation fails.

#### Per-Indicator Reading Shapes (STRICT)

All readings adhere to the global schema: each reading is an object `{ value: number, unit: string }`.

- Types: value MUST be a positive integer (server validation uses integer-only). Decimals will be rejected.
- Units: MUST exactly match the indicator definition (retrieved via `GET /indicators/:id`). Unit mismatches are rejected.

1. Hypertension (name: `hypertension`)

- Required keys in `readings`:
  - `systolic_blood_pressure`: `{ value: <int>, unit: "mmHg" }`
  - `diastolic_blood_pressure`: `{ value: <int>, unit: "mmHg" }`
- Example request:

```json
{
  "patientNumber": 12345,
  "indicator": "<hypertension-indicator-id>",
  "readings": {
    "systolic_blood_pressure": { "value": 138, "unit": "mmHg" },
    "diastolic_blood_pressure": { "value": 92, "unit": "mmHg" }
  }
}
```

- Classification logic:
  - Compares systolic/diastolic against indicator `classifications[*].min_systolic/max_systolic/min_diastolic/max_diastolic`.
  - Uses `logic` (default OR if omitted) to decide if a class matches.
  - Returns the first matching class as `{ label, status_code }` and `recommendations`.

2. Diabetes (name: `diabetes`)

- Required keys in `readings`:
  - `random_blood_glucose`: `{ value: <int>, unit: "mg/dL" }`
- Example request:

```json
{
  "patientNumber": 12345,
  "indicator": "<diabetes-indicator-id>",
  "readings": {
    "random_blood_glucose": { "value": 165, "unit": "mg/dL" }
  }
}
```

- Classification logic:
  - Compares glucose value to indicator `classifications[*].min_value/max_value` ranges.
  - Returns `{ label, status_code }` and `recommendations` of the first matching class.

3. BMI (name: `bmi`)

- Required keys in `readings`:
  - `height`: `{ value: <int cm>, unit: "cm" }` (height in centimeters)
  - `weight`: `{ value: <int kg>, unit: "kg" }` (weight in kilograms)
- Example request:

```json
{
  "patientNumber": 12345,
  "indicator": "<bmi-indicator-id>",
  "readings": {
    "height": { "value": 170, "unit": "cm" },
    "weight": { "value": 70, "unit": "kg" }
  }
}
```

- Classification logic:
  - Computes BMI = weight(kg) / (height(m)^2); height(m) = height(cm)/100.
  - Rounds to 1 decimal, then matches indicator `classifications[*].min_value/max_value` range.
  - Returns `{ label, status_code }` and `recommendations` of the first matching class.

Notes for implementers:

- Indicator-specific required reading keys are fixed (see seeds/indicator definitions or `GET /indicators/:id`).
- Units are enforced: provide exactly `mmHg`, `mg/dL`, `cm`, `kg` as applicable.
- All numeric `value`s must be integers; if you capture decimals, round appropriately on the client before sending.

### GET `/:id`

- Purpose: Get a single assessment (no population) for detail view.
- Auth: Required.
- Response 200:

```json
{
  "status": "success",
  "data": {
    "assessment": {
      "id": "...",
      "patient": "<userId>",
      "indicator": "<indicatorId>",
      "evaluatedBy": "<userId>",
      "readings": {
        /* map */
      },
      "classification": { "label": "...", "status_code": "..." },
      "recommendations": ["..."],
      "evaluatedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

---

### GET `/me/last-24-hours`

- Purpose: For a logged-in social health worker, list assessments they performed in the last 24 hours. Intended for "My recent work" dashboards.
- Auth: Required. Roles: `SOCIAL_HEALTH_WORKER`.
- Response 200:

```json
{
  "status": "success",
  "data": {
    "assessments": [
      {
        "patientNumber": 12345,
        "patientName": "Jane Doe",
        "indicatorName": "hypertension",
        "classificationLabel": "Stage 1 Hypertension"
      }
    ]
  }
}
```

- Notes:
  - `patientName` is `firstname + ' ' + lastname`.
  - Sorted by `evaluatedAt` descending (most recent first).

---

## Referrals

Base: `/api/v1/referrals`

### GET `/me`

- Purpose: For a logged-in `SOCIAL_HEALTH_WORKER`, list referrals for patients under their follow-up.
- Auth: Required. Roles: `SOCIAL_HEALTH_WORKER`.
- Sorting: Most recent first, based on referral creation time.
- 200 Response:

```json
{
  "status": "success",
  "data": {
    "referrals": [
      {
        "id": "...",
        "patientNumber": 12345,
        "referralDate": "2025-01-01T00:00:00.000Z",
        "scheduledVisitDate": "2025-01-31T00:00:00.000Z",
        "status": "PENDING",
        "assessmentCount": 2
      }
    ]
  }
}
```

### GET `/upcoming`

- Purpose: For a logged-in `SOCIAL_HEALTH_WORKER`, list upcoming referrals scheduled between **now** and **48 hours from now** for their assigned patients.
- Auth: Required. Roles: `SOCIAL_HEALTH_WORKER`.
- Sorting: By `scheduledVisitDate` ascending, then newest created first within the same date.
- Limits: Returns at most 5 records.
- 200 Response (same summary shape as `/me`):

```json
{
  "status": "success",
  "data": {
    "referrals": [
      {
        "id": "...",
        "patientNumber": 12345,
        "referralDate": "2025-01-01T00:00:00.000Z",
        "scheduledVisitDate": "2025-01-02T08:00:00.000Z",
        "status": "PENDING",
        "assessmentCount": 1
      }
    ]
  }
}
```

### GET `/pending/count`

- Purpose: For a logged-in `SOCIAL_HEALTH_WORKER`, get the **number of pending referrals** for their assigned patients. Ideal for badge counters on dashboards.
- Auth: Required. Roles: `SOCIAL_HEALTH_WORKER`.
- 200 Response:

```json
{
  "status": "success",
  "data": {
    "count": 7
  }
}
```

### GET `/status/overview`

- Purpose: For a logged-in `SOCIAL_HEALTH_WORKER`, get an overview of referral statuses to power analytics cards.
- Auth: Required. Roles: `SOCIAL_HEALTH_WORKER`.
- 200 Response:

```json
{
  "status": "success",
  "message": "Referral status overview retrieved successfully",
  "data": {
    "summary": {
      "pending": 7,
      "completed_this_month": 3,
      "overdue": 2
    }
  }
}
```

- Semantics:
  - `pending`: Number of referrals with `status="PENDING"` for this health worker.
  - `completed_this_month`: Number of referrals with `status="COMPLETED"` whose `visitDate` is within the current calendar month.
  - `overdue`: Number of referrals with `status="PENDING"` and `scheduledVisitDate` before **today**.

### GET `/:id`

- Purpose: Get single referral details by id (no population).
- Auth: Required. Roles: `SOCIAL_HEALTH_WORKER`.
- Response 200:

```json
{
  "status": "success",
  "data": {
    "referral": {
      "id": "...",
      "patient": "<userId>",
      "patientNumber": 12345,
      "clinicalProfile": "<clinicalProfileId>",
      "referralDate": "...",
      "scheduledVisitDate": "...",
      "status": "PENDING",
      "assessments": ["<assessmentId>", "..."],
      "referredBy": "<userId>",
      "createdAt": "...",
      "updatedAt": "...",
      "visitDate": "2025-01-15T10:00:00.000Z"
    }
  }
}
```

### PATCH `/complete/:patientNumber`

- Purpose: Nurse completes the latest pending referral for a patient by `patientNumber`.
- Auth: Required. Roles: `NURSE`.
- 200 Response:

```json
{
  "status": "success",
  "data": {
    "referral": {
      /* updated referral populated with patient */
    }
  }
}
```

- 404 if no pending referral for that patient.

---

## Data Models (Frontend-Oriented)

These reflect the DTOs returned by the API.

### Indicator

- Summary: `{ id: string, name: string, labels: string[] }`
- Details: `{ id: string, name: string, readings: Array<{type:string, unit:string}>, classifications: Array<{ status_code: 'healthy'|'warning'|'danger'|'critical', label: string, min_systolic?: number, max_systolic?: number, min_diastolic?: number, max_diastolic?: number, min_value?: number, max_value?: number, logic?: 'OR'|'AND', recommendations: string[] }> }`

### Assessment

- Create request: `{ patientNumber: number, indicator: string, readings: Record<string, { value: number; unit: string }> }`
- Created response: `{ id: string, readings: Record<string, { value:number; unit:string }>, classification: { label: string; status_code: 'healthy'|'warning'|'danger'|'critical' }, recommendations: string[] }`
- Details: `{ id: string, patient: string, indicator: string, evaluatedBy: string, readings: Record<string, {value:number; unit:string}>, classification: { label: string; status_code: ... }, recommendations: string[], evaluatedAt: string }`

### RecentAssessmentSummary

- Used by `/assessments/me/last-24-hours` for the logged-in social health worker.
- Shape: `{ patientNumber: number, patientName: string, indicatorName: string, classificationLabel: string }`

### Referral

- Summary: `{ id: string, patientNumber: number, referralDate: string, scheduledVisitDate: string, status: 'PENDING'|'COMPLETED'|'CANCELLED', assessmentCount: number }`
- Details: `{ id: string, patient: string, patientNumber: number, clinicalProfile: string, referralDate: string, scheduledVisitDate: string, status: 'PENDING'|'COMPLETED'|'CANCELLED', assessments: string[], referredBy: string, createdAt: string, updatedAt: string, visitDate?: string }`

### ReferralStatusSummary

- Dashboard counts for a social health worker.
- Shape: `{ pending: number, completed_this_month: number, overdue: number }`

### User

- List item: `{ id: string, name: string, roles: string[] }`
- Patient lookup: `{ nationalIdentificationNumber: string, firstname: string, lastname: string, phone: string }`

### Auth

- Login response: `{ token: string, user: { id: string, roles: string[] }, activeRole?: string }`

---

## Validation Summary (Server-Side)

- Login
  - `identifier`: required string
  - `password`: string, min length 6
- Register User
  - `firstname`, `lastname`: required
  - `birthdate`: valid date
  - `address`: all fields required (`province`, `district`, `sector`, `cell`, `village`)
  - `contact.phone`: `+` optional, numeric, min length 10
  - `contact.email`: valid email
  - `nationalIdentificationNumber`: 16 digits
- Register User with Account (Admin)
  - All above + `roles`: non-empty array of valid roles
- Create Assessment
  - `patientNumber`: positive integer
  - `indicator`: non-empty string (ObjectId)
  - `readings`: record of `{ value: positive integer, unit: non-empty string }`
    - Hypertension expects `systolic_blood_pressure` and `diastolic_blood_pressure` with `unit="mmHg"`.
    - Diabetes expects `random_blood_glucose` with `unit="mg/dL"`.
    - BMI expects `height` (`cm`) and `weight` (`kg`).
  - Unit compatibility with indicator definition is enforced

Error shape for validation failures:

```json
{
  "status": "fail",
  "message": "Invalid request data",
  "errors": [{ "field": "contact.email", "message": "Invalid email address" }]
}
```

---

## Authorization Matrix (Quick View)

- `/auth/login`: Public
- `/users` (GET): `ADMIN`
- `/users` (POST): `SOCIAL_HEALTH_WORKER` or `SCREENING_VOLUNTEER`
- `/users/admin/register` (POST): `ADMIN`
- `/users/:patientNumber` (GET): Public
- `/indicators/*`: Public
- `/assessments` (POST): Any authenticated user
- `/assessments/:id` (GET): Any authenticated user
- `/referrals/me` (GET): `SOCIAL_HEALTH_WORKER`
- `/referrals/upcoming` (GET): `SOCIAL_HEALTH_WORKER`
- `/referrals/pending/count` (GET): `SOCIAL_HEALTH_WORKER`
- `/referrals/status/overview` (GET): `SOCIAL_HEALTH_WORKER`
- `/referrals/:id` (GET): `SOCIAL_HEALTH_WORKER`
- `/referrals/complete/:patientNumber` (PATCH): `NURSE`

---

## Integration Recipes (for Dynamic UIs)

- On login, store `token` and `roles`. Consider letting the user choose an active role for UI.
- Use `/indicators` to render measurement forms (fields from `readings`) and labels for interpretation.
- After submitting an assessment, show the classification and recommendations. If abnormal, inform the user a referral was or will be created.
- Social Health Worker dashboard:
  - Use `/referrals/me` to list assigned pending referrals. Link to details via `/referrals/:id`.
  - Use `/referrals/upcoming` for a "Next 48 hours" widget (limit 5).
  - Use `/referrals/pending/count` to display a numeric badge on a "Referrals" menu item.
  - Use `/referrals/status/overview` to power dashboard cards (Pending, Completed this month, Overdue).
  - Use `/assessments/me/last-24-hours` to show a list of assessments recorded in the last 24 hours.
- Nurse workflow:
  - Use `/referrals/complete/:patientNumber` to mark the latest pending referral as completed when the patient visits.
- Admin workflow:
  - Use `/users` (GET) to manage users overview and `/users/admin/register` to create operational accounts.
- Patient lookup:
  - Use `/users/:patientNumber` to quickly verify identity and contact before assessment.

---

## Curl Examples

Login:

```bash
curl -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"secret123"}'
```

List indicators:

```bash
curl -X GET "$BASE/api/v1/indicators"
```

Create assessment (Bearer auth):

```bash
curl -X POST "$BASE/api/v1/assessments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientNumber": 12345,
    "indicator": "65f...",
    "readings": {
      "systolic_blood_pressure": {"value": 138, "unit": "mmHg"},
      "diastolic_blood_pressure": {"value": 92, "unit": "mmHg"}
    }
  }'
```

List my referrals (SHW):

```bash
curl -X GET "$BASE/api/v1/referrals/me" -H "Authorization: Bearer $TOKEN"
```

Complete referral (Nurse):

```bash
curl -X PATCH "$BASE/api/v1/referrals/complete/12345" -H "Authorization: Bearer $TOKEN"
```

---

## Notes & Limits

- Pagination/filters are not yet implemented on list endpoints.
- Some endpoints are intentionally public to support kiosk-like lookup (e.g., `GET /users/:patientNumber`). If privacy requirements change, add protection accordingly.
- Token verification loads the user by `sub` from the JWT and rejects if the user no longer exists.
- Timezone assumptions are server-local for date fields.

---

## Changelog

- 2026-01-22: Initial comprehensive API documentation added.

---

## Appendix: Frontend Integration Guide

### Standard Response Envelope and Codes

- Success: `{ status: "success", message?: string, data: <payload> }` (200/201)
- Validation fail: `{ status: "fail", message: string, errors: Array<{ field: string, message: string }> }` (400)
- Auth fail: `{ status: "fail", message: string }` (401)
- Forbidden: `{ status: "fail", message: string }` (403)
- Not found: `{ status: "fail", message: string }` (404)
- Server error: `{ status: "error", message: string }` (500)

Examples:

- 401:

```json
{ "status": "fail", "message": "Unauthenticated. Please log in to access this resource" }
```

- 403:

```json
{ "status": "fail", "message": "You do not have permission to perform this action." }
```

- 404:

```json
{ "status": "fail", "message": "Resource not found" }
```

### UI Rendering Guidance

- Severity mapping for `classification.status_code`:
  - `healthy` → success (green)
  - `warning` → warning (amber)
  - `danger` → error (red)
  - `critical` → critical (red, high emphasis)
- Forms from indicators:
  - Build inputs from `indicator.readings`: the `type` is the field key; display `unit` next to input.
  - Values must be integers; round client-side if using decimals.
  - Validate units exactly (`mmHg`, `mg/dL`, `cm`, `kg`).
- Hints from classifications:
  - Use `min_*`/`max_*` or `min_value`/`max_value` as soft ranges to guide input and display tooltips.

### End-to-End Workflow Recipes

1. Login → store `token`, `roles` → optional active role selector.
2. SHW/Volunteer: Register patient → receive `patientNumber` → perform assessment.
3. Assessment: Submit readings → display classification + recommendations → if abnormal, referral appears in SHW list and affects dashboard counters/widgets.
4. SHW dashboard: Show pending referrals list (`/referrals/me`), upcoming next 48h (`/referrals/upcoming`), status overview cards (`/referrals/status/overview`), and last-24h assessments (`/assessments/me/last-24-hours`).
5. Nurse: Complete referral using patient number.
6. Admin: Register staff accounts with roles.

### Pagination & Filtering

- Not implemented on list endpoints; implement client-side filtering/sorting for now.
