# Referral Retrieval APIs (Developer/Engineer)

Implementation flow and query behavior for referral retrieval endpoints. Intended for backend engineers and API maintainers.

## Endpoint Inventory

* **GET /referrals**: List referrals in the caller's source scope. Roles: `SOCIAL_HEALTH_WORKER`, `NURSE`.
* **GET /referrals/patient/:patientNumber**: Get single referral by patient number within scope. Roles: `SOCIAL_HEALTH_WORKER`, `NURSE`.

## Shared Source Filter Resolution (resolveSourceFilter)

```mermaid
sequenceDiagram
    participant Client
    participant Auth as protect + authorize
    participant Scope as resolveSourceFilter
    participant API

    Client->>Auth: GET /referrals* request
    Auth->>Scope: resolve scope from user
    Scope->>Scope: resolve role + assignment
    alt NURSE + hospitalId
        Scope->>API: set referralFilter to hospitalId
    else SOCIAL_HEALTH_WORKER + managed CHU
        Scope->>API: set referralFilter from chuId + fromType CommunityHealthUnit
    else No scope
        Scope->>API: set referralFilter empty
    end
```

## Get All Referrals (GET /referrals)

```mermaid
sequenceDiagram
    participant Client
    participant Auth as protect + authorize
    participant Scope as resolveSourceFilter
    participant Controller as ReferralController
    participant Service as ReferralService
    participant Features as APIFeatures
    participant DB as MongoDB

    Client->>Auth: GET /referrals
    Auth->>Scope: resolve scope
    Scope->>Controller: referralFilter attached
    Controller->>Controller: validate status query
    alt invalid status
        Controller-->>Client: 400 Invalid status
    else valid status
        Controller->>Service: getAllReferrals(query, referralFilter)
        Service->>Features: filter + sort + limitFields + paginate
        Features->>DB: find + count
        DB-->>Service: referrals + total
        Service-->>Controller: referrals + pagination
        Controller-->>Client: 200 referrals + pagination
    end
```

**Query handling (APIFeatures)**
* Controller validates `status` query against `PENDING`, `COMPLETED`, `CANCELLED` before executing the query.
* Filtering: excludes `page`, `sort`, `limit`, `fields`; supports `gte`, `gt`, `lte`, `lt` operators; date strings (YYYY-MM-DD) converted to Kigali day start (UTC) before hitting Mongo.
* Sorting: `sort` param (comma-separated), default `-createdAt`.
* Field limiting: `fields` param, default excludes `__v`.
* Pagination: `page`/`limit` with defaults page=1, limit=20, max limit=200; response includes `PaginationMeta`.

## Get Referral By Patient Number (GET /referrals/patient/:patientNumber)

```mermaid
sequenceDiagram
    participant Client
    participant Auth as protect + authorize
    participant Scope as resolveSourceFilter
    participant Controller as ReferralController
    participant Service as ReferralService
    participant DB as MongoDB

    Client->>Auth: GET /referrals/patient/:patientNumber
    Auth->>Scope: resolve scope
    Scope->>Controller: referralFilter attached
    Controller->>Controller: validate patientNumber
    alt missing patientNumber
        Controller-->>Client: ParameterIsRequiredError
    else patientNumber present
        Controller->>Service: getReferral(filter)
        Service->>DB: findOne + select + populate
        DB-->>Service: referral
        Service-->>Controller: referral
        Controller-->>Client: 200 referral
    end
```

**Single-referral filter and shape**
* Filter composition: `{ patientNumber: Number(...), ...req.referralFilter }`.
* Projection: `_id`, `patientNumber`, `from`, `fromType`, `to`, `scheduledVisitDate`, `status`.
* Population: `from` and `to` resolved with full documents.
