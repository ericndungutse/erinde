# Referral Retrieval APIs (Developer/Engineer)

Implementation flow and query behavior for referral retrieval endpoints. Intended for backend engineers and API maintainers.

## Endpoint Inventory

* **GET /referrals**: List referrals in the caller's source scope. Roles: `SOCIAL_HEALTH_WORKER`, `NURSE`.
* **GET /referrals/patient/:patientNumber**: Get single referral by patient number within scope. Roles: `SOCIAL_HEALTH_WORKER`, `NURSE`.

## Shared Source Filter Resolution (resolveSourceFilter)

```mermaid
flowchart TD
    A[GET /referrals* request] --> B[protect + authorize]
    B --> C[resolveSourceFilter middleware]
    C --> D{User role + assignment}
    D -->|NURSE + hospitalId| E[req.referralFilter = { to: hospitalId }]
    D -->|SOCIAL_HEALTH_WORKER + managed CHU| F[req.referralFilter = { from: chuId, fromType: CommunityHealthUnit }]
    D -->|No scope| G[req.referralFilter = {}]
```

## Get All Referrals (GET /referrals)

```mermaid
flowchart TD
    A[Client GET /referrals] --> B[protect + authorize]
    B --> C[resolveSourceFilter -> req.referralFilter]
    C --> D[ReferralController.getReferrals]
    D --> E{status query valid?}
    E -->|no| F[400 Invalid status]
    E -->|yes| G[ReferralService.getAllReferrals(query, referralFilter)]
    G --> H[APIFeatures: filter -> sort -> limitFields -> paginate]
    H --> I[Run query + count for pagination]
    I --> J[200 { referrals, pagination }]
```

**Query handling (APIFeatures)**
* Controller validates `status` query against `PENDING`, `COMPLETED`, `CANCELLED` before executing the query.
* Filtering: excludes `page`, `sort`, `limit`, `fields`; supports `gte`, `gt`, `lte`, `lt` operators; date strings (YYYY-MM-DD) converted to Kigali day start (UTC) before hitting Mongo.
* Sorting: `sort` param (comma-separated), default `-createdAt`.
* Field limiting: `fields` param, default excludes `__v`.
* Pagination: `page`/`limit` with defaults page=1, limit=20, max limit=200; response includes `PaginationMeta`.

## Get Referral By Patient Number (GET /referrals/patient/:patientNumber)

```mermaid
flowchart TD
    A[Client GET /referrals/patient/:patientNumber] --> B[protect + authorize]
    B --> C[resolveSourceFilter -> req.referralFilter]
    C --> D[ReferralController.getReferralByPatientNumber]
    D --> E{patientNumber present?}
    E -->|no| F[ParameterIsRequiredError]
    E -->|yes| G[ReferralService.getReferral(filter)]
    G --> H[Referral.findOne(filter)]
    H --> I[Select fields + populate from/to]
    I --> J[200 { referral }]
```

**Single-referral filter and shape**
* Filter composition: `{ patientNumber: Number(...), ...req.referralFilter }`.
* Projection: `_id`, `patientNumber`, `from`, `fromType`, `to`, `scheduledVisitDate`, `status`.
* Population: `from` and `to` resolved with full documents.
