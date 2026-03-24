# ERINDE – Project Overview

> **A complete reference for engineers, developers, and non-technical stakeholders.**

---

## Table of Contents

1. [What Is ERINDE? (Non-Technical Summary)](#1-what-is-erinde-non-technical-summary)
2. [High-Level System Overview](#2-high-level-system-overview)
3. [Who Uses the System? (User Roles)](#3-who-uses-the-system-user-roles)
4. [How It Works – End-to-End Journey](#4-how-it-works--end-to-end-journey)
5. [System Architecture (Technical)](#5-system-architecture-technical)
6. [Database Schema](#6-database-schema)
7. [API Endpoints at a Glance](#7-api-endpoints-at-a-glance)
8. [Authentication & Security Flow](#8-authentication--security-flow)
9. [Assessment Classification Logic](#9-assessment-classification-logic)
10. [Referral Workflow](#10-referral-workflow)
11. [Project File Structure](#11-project-file-structure)
12. [Tech Stack Summary](#12-tech-stack-summary)

---

## 1. What Is ERINDE? (Non-Technical Summary)

**ERINDE** is a digital health platform designed for community health management in **Rwanda**. It helps health workers screen patients in the community, automatically analyse health readings, and connect at-risk patients to the right medical facility — all without manual paperwork.

### The Problem It Solves

In Rwanda, community health workers visit patients at home or in village health posts. They measure things like blood pressure, weight, or blood sugar. Traditionally, deciding what to do with those results — and getting a patient seen at a hospital — relied on manual processes that were slow and error-prone.

### What ERINDE Does

| What | How |
|------|-----|
| **Records health readings** | Health workers enter measurements on a device |
| **Automatically analyses results** | The system classifies readings as healthy, warning, or critical |
| **Recommends next steps** | Based on the classification, the system suggests clinical actions |
| **Creates referrals automatically** | If a patient needs hospital care, a referral is generated instantly |
| **Routes patients to the right facility** | From Community Health Unit → Health Center → Hospital |
| **Tracks follow-ups** | Nurses at hospitals can see referrals and mark them complete |
| **Supports two languages** | English and Kinyarwanda |

### Key Benefits for Stakeholders

- ✅ Reduces delays in getting patients the right care
- ✅ Eliminates manual paperwork and phone-based referrals
- ✅ Gives administrators a real-time view of community health
- ✅ Helps nurses prioritise who to see next
- ✅ Ensures no patient is missed — the system guards against duplicate or premature re-assessments

---

## 2. High-Level System Overview

```mermaid
graph TB
    subgraph "Community Level"
        SHW["👤 Social Health Worker\n(SHW)"]
        VOL["👤 Screening Volunteer"]
        CHU["🏥 Community Health Unit\n(Village Post)"]
    end

    subgraph "ERINDE Platform"
        API["🔌 REST API\n(Node.js / Express)"]
        ENGINE["🧠 Assessment &\nClassification Engine"]
        REFERRAL["📋 Referral\nManagement"]
        AUTH["🔐 Auth &\nRole Control"]
        DB[("🗄️ MongoDB\nDatabase")]
    end

    subgraph "Facility Level"
        NURSE["👩‍⚕️ Nurse"]
        HOSPITAL["🏨 Hospital /\nHealth Center"]
    end

    subgraph "Administration"
        ADMIN["🛠️ System Admin"]
    end

    SHW -->|"Records assessment"| API
    VOL -->|"Records assessment"| API
    NURSE -->|"Manages referrals"| API
    ADMIN -->|"Manages system"| API

    API --> AUTH
    API --> ENGINE
    ENGINE --> DB
    ENGINE --> REFERRAL
    REFERRAL --> DB
    AUTH --> DB

    CHU -.->|"Associated with"| SHW
    HOSPITAL -.->|"Receives referrals"| REFERRAL
    NURSE -.->|"Belongs to"| HOSPITAL
```

---

## 3. Who Uses the System? (User Roles)

```mermaid
graph LR
    subgraph Roles
        ADMIN["🛠️ ADMIN\nManages users,\nseeds data"]
        SHW["👤 SOCIAL_HEALTH_WORKER\nRecords assessments,\nviews own referrals"]
        VOL["🙋 SCREENING_VOLUNTEER\nRecords assessments"]
        NURSE["👩‍⚕️ NURSE\nViews hospital referrals,\nmarks complete"]
        USER["👥 USER\nBasic patient/citizen"]
    end

    ADMIN -- "creates accounts for" --> SHW
    ADMIN -- "creates accounts for" --> NURSE
    SHW -- "registers" --> USER
    SHW -- "takes assessment for" --> USER
    VOL -- "takes assessment for" --> USER
    NURSE -- "receives referral for" --> USER
```

| Role | Can Do |
|------|--------|
| **ADMIN** | Create user accounts, manage system data |
| **SOCIAL_HEALTH_WORKER** | Register patients, record assessments, view own referrals & upcoming visits |
| **SCREENING_VOLUNTEER** | Record assessments for patients |
| **NURSE** | View referrals assigned to their hospital, mark as complete |
| **USER** | Basic record — no login by default |

---

## 4. How It Works – End-to-End Journey

```mermaid
sequenceDiagram
    actor SHW as Social Health Worker
    participant API as ERINDE API
    participant CLASS as Classifier Engine
    participant DB as MongoDB
    actor NURSE as Nurse (Hospital)

    SHW->>API: Login (POST /auth/login)
    API-->>SHW: JWT Token

    SHW->>API: Look up patient (GET /users/:patientNumber)
    API-->>SHW: Patient data

    SHW->>API: Submit assessment (POST /assessments)
    Note right of SHW: Provides indicator, readings\n(e.g. systolic=140, diastolic=92)

    API->>CLASS: Classify readings against thresholds
    CLASS-->>API: Classification result (e.g. STAGE_1_HYPERTENSION, status=warning)

    API->>DB: Save assessment + classification

    alt Abnormal result (warning/danger/critical)
        API->>DB: Create or update referral (PENDING)
        API-->>SHW: Assessment saved + Referral created
    else Healthy result
        API-->>SHW: Assessment saved, no referral needed
    end

    NURSE->>API: Login & fetch hospital referrals\n(GET /nurse/referrals)
    API-->>NURSE: List of pending referrals

    NURSE->>API: Mark referral complete\n(PATCH /nurse/referrals/complete/:patientNumber)
    API-->>NURSE: Referral marked COMPLETED
```

---

## 5. System Architecture (Technical)

### Layered Architecture

```mermaid
graph TD
    subgraph "HTTP Layer"
        R["Routes\n(src/routes/)"]
        MW["Middleware\nAuth, Validation, i18n"]
    end

    subgraph "Application Layer"
        C["Controllers\n(src/controller/)"]
        RF["ResponseFactory\nStandardised responses"]
    end

    subgraph "Business Logic Layer"
        S["Services\n(src/service/)"]
        CL["Assessment Classifier\nassessment-classifier.service.ts"]
        V["Validators\n(src/validation/)"]
    end

    subgraph "Data Layer"
        M["Mongoose Models\n(src/models/)"]
        DB[("MongoDB")]
    end

    subgraph "Cross-cutting"
        DI["Dependency Injection\ncontainer.ts"]
        ERR["Error Handling\n(src/Errors/)"]
        I18N["i18n\nEnglish + Kinyarwanda"]
        SEC["Security\nJWT + bcrypt"]
    end

    R --> MW --> C --> S --> M --> DB
    C --> RF
    S --> CL
    S --> V
    DI -.->|"wires"| C
    DI -.->|"wires"| S
    ERR -.->|"catches"| C
    I18N -.->|"translates"| C
    SEC -.->|"protects"| R
```

### Request Lifecycle

```mermaid
flowchart LR
    REQ([HTTP Request]) --> CORS
    CORS --> JWT_MW["JWT Middleware\n(protect)"]
    JWT_MW --> ROLE_MW["Role Middleware\n(authorize)"]
    ROLE_MW --> VALID["Zod Validator"]
    VALID --> CTRL["Controller"]
    CTRL --> SVC["Service"]
    SVC --> MODEL["Mongoose Model"]
    MODEL --> MONGO[("MongoDB")]
    MONGO --> MODEL
    MODEL --> SVC
    SVC --> CTRL
    CTRL --> RF["ResponseFactory"]
    RF --> RES([HTTP Response])

    ERR_H["Global Error Handler"] -.->|"catches any error"| RES
```

---

## 6. Database Schema

```mermaid
erDiagram
    USERS {
        ObjectId _id PK
        string firstName
        string lastName
        string[] roles
        string province
        string district
        string sector
        string cell
        string village
        string phone
        string email
        string __t "Discriminator: Nurse"
        ObjectId hospitalId FK
    }

    ACCOUNTS {
        ObjectId _id PK
        string email
        string phone
        string password "bcrypt hashed"
        boolean mustChangePassword
        ObjectId userId FK
    }

    CLINICAL_PROFILES {
        ObjectId _id PK
        ObjectId patientId FK
        string patientNumber "auto-generated"
    }

    ASSESSMENTS {
        ObjectId _id PK
        ObjectId patientId FK
        ObjectId takenBy FK
        ObjectId indicator FK
        Map readings "key: readingName, val: {value, unit}"
        object classification "{label, status_code}"
        Date evaluatedDate
        string takenFromModel "CHU or Hospital"
        ObjectId takenFrom FK
    }

    REFERRALS {
        ObjectId _id PK
        ObjectId patientId FK
        ObjectId[] assessments FK
        string status "PENDING|COMPLETED|CANCELLED|ESCALATED"
        ObjectId toHospital FK
        string fromModel "CHU or Hospital"
        ObjectId from FK
        Date scheduledVisitDate
        Date referralDate
    }

    INDICATORS {
        ObjectId _id PK
        string name
        object readings "array of {name, type, unit}"
        object classifications "thresholds with labels & status codes"
        string logicMode "OR | AND"
    }

    HOSPITALS {
        ObjectId _id PK
        string name
        string type
        string province
        string district
    }

    COMMUNITY_HEALTH_UNITS {
        ObjectId _id PK
        string name
        ObjectId shwId FK
        ObjectId healthCenterId FK
        string province
        string district
        string sector
        string cell
        string village
    }

    COUNTERS {
        ObjectId _id PK
        string name
        number seq
    }

    USERS ||--o{ ASSESSMENTS : "assessed"
    USERS ||--o{ REFERRALS : "referred"
    USERS ||--|| ACCOUNTS : "login via"
    USERS ||--|| CLINICAL_PROFILES : "has profile"
    INDICATORS ||--o{ ASSESSMENTS : "defines"
    HOSPITALS ||--o{ REFERRALS : "receives"
    HOSPITALS ||--o{ USERS : "employs nurse"
    COMMUNITY_HEALTH_UNITS ||--o{ ASSESSMENTS : "site of"
    ASSESSMENTS ||--o{ REFERRALS : "grouped into"
```

---

## 7. API Endpoints at a Glance

**Base URL:** `POST /api/v1`

```mermaid
mindmap
  root((API /api/v1))
    auth
      POST /auth/login
    users
      GET /users
      POST /users
      POST /users/admin/register
      GET /users/:patientNumber
      GET /users/admin/:userId
      PATCH /users/admin/:userId/update-password
    assessments
      POST /assessments
      GET /assessments/:id
      GET /assessments/me/last-24-hours
    referrals SHW
      GET /shw/referrals/me
      GET /shw/referrals/upcoming
      GET /shw/referrals/pending/count
      GET /shw/referrals/status/overview
    referrals Nurse
      GET /nurse/referrals
      GET /nurse/referrals/:id
      PATCH /nurse/referrals/complete/:patientNumber
    indicators
      GET /indicators
      GET /indicators/:id
    hospitals
      GET /hospitals
      GET /hospitals/:id
    community-health-units
      GET /community-health-units
      GET /community-health-units/:id
    health
      GET /health
```

### Role × Endpoint Access Matrix

| Endpoint Group | ADMIN | SHW | VOLUNTEER | NURSE |
|---|:---:|:---:|:---:|:---:|
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ |
| `POST /users` (register patient) | — | ✅ | ✅ | — |
| `POST /users/admin/register` | ✅ | — | — | — |
| `POST /assessments` | ✅ | ✅ | ✅ | ✅ |
| `GET /assessments/me/last-24-hours` | — | ✅ | — | — |
| `GET /shw/referrals/*` | — | ✅ | — | — |
| `GET /nurse/referrals` | — | — | — | ✅ |
| `PATCH /nurse/referrals/complete/*` | — | — | — | ✅ |
| `GET /indicators` | ✅ | ✅ | ✅ | ✅ |
| `GET /hospitals` | ✅ | ✅ | ✅ | ✅ |

---

## 8. Authentication & Security Flow

```mermaid
sequenceDiagram
    actor Client
    participant API as Express API
    participant AUTH as Auth Middleware
    participant DB as MongoDB

    Client->>API: POST /auth/login\n{ email, password }
    API->>DB: Find account by email
    DB-->>API: Account record
    API->>API: bcrypt.compare(password, hash)

    alt Valid credentials
        API->>API: Sign JWT\n{ accountId, roles, sub, exp }
        API-->>Client: 200 OK + JWT token
    else Invalid credentials
        API-->>Client: 401 Unauthorized
    end

    Note over Client,API: Subsequent protected requests

    Client->>API: ANY protected route\nAuthorization: Bearer <token>
    API->>AUTH: protect() middleware
    AUTH->>AUTH: jwt.verify(token, secret)
    AUTH->>DB: Confirm user still exists
    DB-->>AUTH: User record

    alt Token valid & user exists
        AUTH->>AUTH: authorize(requiredRoles)
        AUTH->>AUTH: Check req.user.roles ∩ requiredRoles

        alt Role allowed
            AUTH-->>API: Continue to Controller
        else Role not allowed
            AUTH-->>Client: 403 Forbidden
        end
    else Token invalid / expired
        AUTH-->>Client: 401 Unauthorized
    end
```

---

## 9. Assessment Classification Logic

```mermaid
flowchart TD
    START([Assessment Submitted]) --> VALIDATE{Validate\nreadings & units}
    VALIDATE -- Invalid --> ERR1([400 Bad Request])
    VALIDATE -- Valid --> PENDING{Patient has\npending referral\nfor this indicator?}
    PENDING -- Yes --> ERR2([409 Conflict\nHasPendingReferral])
    PENDING -- No --> TYPE{Indicator\nType}

    TYPE -->|Hypertension| HTN["Check thresholds\nSystolic + Diastolic\nLogic mode: OR / AND"]
    TYPE -->|BMI| BMI_CALC["Calculate BMI\nweight(kg) / height(m)²"]
    TYPE -->|Diabetes| DM["Compare RBG\nagainst thresholds"]

    HTN --> CLASS["Classify:\nhealthy / warning\ndanger / critical"]
    BMI_CALC --> CLASS
    DM --> CLASS

    CLASS --> SAVE["Save Assessment +\nClassification to DB"]

    SAVE --> STATUS{Status?}
    STATUS -- healthy --> DONE([✅ Done — No Referral])
    STATUS -- warning/danger/critical --> REFER["Create or Update\nReferral (PENDING)"]
    REFER --> DONE2([✅ Done — Referral Created])
```

### Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| `healthy` | All readings within normal range | No referral |
| `warning` | Mild deviation from normal | Referral created |
| `danger` | Significant deviation | Referral created |
| `critical` | Severe / immediate risk | Referral created (urgent) |

---

## 10. Referral Workflow

```mermaid
stateDiagram-v2
    [*] --> PENDING : Assessment classified\nas warning/danger/critical

    PENDING --> COMPLETED : Nurse marks\npatient seen
    PENDING --> CANCELLED : Referral withdrawn
    PENDING --> ESCALATED : Condition worsened,\nelevated to higher facility

    COMPLETED --> [*]
    CANCELLED --> [*]
    ESCALATED --> [*]

    note right of PENDING
        Daily consolidation:
        Multiple same-day assessments
        for same indicator grouped
        into ONE referral
    end note
```

### Referral Routing

```mermaid
graph LR
    PATIENT["🧑 Patient\n(Village)"]
    CHU["🏥 Community\nHealth Unit"]
    HC["🏨 Health\nCenter"]
    HOSP["🏦 Hospital"]

    PATIENT -->|"Assessed by SHW at"| CHU
    CHU -->|"Referral sent to"| HOSP
    HC -.->|"Intermediate\n(if needed)"| HOSP

    style PATIENT fill:#e8f5e9
    style CHU fill:#fff9c4
    style HC fill:#ffe0b2
    style HOSP fill:#fce4ec
```

---

## 11. Project File Structure

```
erinde/
├── src/
│   ├── index.ts                  # 🚀 App entry point (starts server)
│   ├── app.ts                    # Express app configuration & middleware
│   ├── container.ts              # Dependency injection wiring
│   ├── i18n.ts                   # i18n setup (EN + Kinyarwanda)
│   │
│   ├── routes/                   # 🔀 URL → Controller mapping
│   ├── controller/               # 📥 HTTP request/response handlers
│   ├── service/                  # 🧠 Business logic
│   │   ├── interface/            #     Service contracts (TypeScript interfaces)
│   │   └── assessment-classifier.service.ts  # Health classification engine
│   │
│   ├── models/                   # 🗄️ Mongoose schemas & DB models
│   ├── validation/               # ✅ Zod input validation schemas
│   ├── dto/                      # 📦 Data Transfer Objects
│   ├── domain/                   # 📐 Core TypeScript domain types
│   ├── types/                    # 🏷️ Shared TypeScript type definitions
│   ├── security/                 # 🔐 JWT utils & auth middleware
│   ├── Errors/                   # ❌ Custom error classes
│   ├── middleware/               # 🔧 Express middleware
│   ├── utils/                    # 🛠️ Shared utilities
│   ├── constants/                # 📌 App-wide constants
│   ├── locale/                   # 🌍 Translation files (en.json, rw.json)
│   ├── seed/                     # 🌱 Database seed scripts
│   └── test/                     # 🧪 Tests (26 test files)
│       ├── service/
│       └── fixtures/
│
├── docs/                         # 📚 Documentation
│   ├── PROJECT_OVERVIEW.md       # ← You are here
│   ├── technical-overview.md
│   ├── api.md                    # Full API reference
│   └── assessment-business-logic.md
│
├── package.json                  # Node project config & scripts
├── tsconfig.json                 # TypeScript config
├── vitest.config.ts              # Test runner config
└── Jenkinsfile                   # CI/CD pipeline definition
```

---

## 12. Tech Stack Summary

```mermaid
graph TD
    subgraph "Runtime"
        NODE["Node.js\n(ES Modules)"]
        TS["TypeScript 5.9"]
    end

    subgraph "Web Framework"
        EXPRESS["Express.js v5"]
    end

    subgraph "Database"
        MONGO["MongoDB"]
        MONGOOSE["Mongoose v9\n(ODM)"]
    end

    subgraph "Auth & Security"
        JWT["JSON Web Tokens"]
        BCRYPT["bcrypt\n(password hashing)"]
    end

    subgraph "Validation"
        ZOD["Zod v4\n(runtime schema validation)"]
    end

    subgraph "Internationalisation"
        I18N["i18next\n(EN + Kinyarwanda)"]
    end

    subgraph "Testing"
        VITEST["Vitest"]
        SUPERTEST["Supertest"]
        FAKER["@faker-js/faker"]
        MONGOMEM["MongoDB Memory Server"]
    end

    subgraph "CI/CD"
        JENKINS["Jenkins Pipeline"]
    end

    NODE --> EXPRESS
    TS --> NODE
    EXPRESS --> MONGOOSE --> MONGO
    EXPRESS --> JWT
    EXPRESS --> ZOD
    EXPRESS --> I18N
    JWT --> BCRYPT
```

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js + TypeScript | TS 5.9.3 |
| HTTP Framework | Express.js | 5.2.1 |
| Database | MongoDB + Mongoose | Mongoose 9.1.1 |
| Auth | JSON Web Tokens | 9.0.3 |
| Password Hashing | bcrypt | 6.0.0 |
| Validation | Zod | 4.3.4 |
| i18n | i18next | 25.8.13 |
| Testing | Vitest + Supertest | Vitest 4.0.16 |
| CI/CD | Jenkins | — |

---

*Last updated: March 2026*
